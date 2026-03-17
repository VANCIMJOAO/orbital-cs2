import { NextRequest, NextResponse } from "next/server";
import { getFaceitMatch, getFaceitMatchStats, type FaceitWebhookEvent } from "@/lib/faceit";
import { mapFaceitMatch, enrichStatsWithSteamIds } from "@/lib/faceit-mapper";
import { saveFaceitMatch } from "@/lib/faceit-db";
import {
  syncFaceitMatchToG5API,
  findG5TeamsFromSteamIds,
  findTournamentByFaceitChampionship,
  linkFaceitMatchToBracket,
  autoAdvanceTournamentBracket,
} from "@/lib/faceit-sync";

const WEBHOOK_SECRET = process.env.FACEIT_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  // Verificar secret se configurado
  if (WEBHOOK_SECRET) {
    const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const urlSecret = req.nextUrl.searchParams.get("secret");
    if (headerSecret !== WEBHOOK_SECRET && urlSecret !== WEBHOOK_SECRET) {
      console.warn("[FACEIT WEBHOOK] Invalid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const event: FaceitWebhookEvent = await req.json();
    const eventType = event.event;
    const matchId = event.payload?.id;

    console.log(`[FACEIT WEBHOOK] ${eventType} — match: ${matchId}`);

    switch (eventType) {
      case "match_status_ready":
      case "match_status_configuring":
        await handleMatchReady(matchId, event);
        break;

      case "match_status_finished":
        await handleMatchFinished(matchId);
        break;

      case "match_status_cancelled":
      case "match_status_aborted":
        await handleMatchCancelled(matchId);
        break;

      case "match_demo_ready":
        await handleDemoReady(matchId);
        break;

      default:
        console.log(`[FACEIT WEBHOOK] Evento ignorado: ${eventType}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("[FACEIT WEBHOOK ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Match pronta/ao vivo — vincular ao bracket ──

async function handleMatchReady(matchId: string, event: FaceitWebhookEvent) {
  try {
    const faceitMatch = await getFaceitMatch(matchId);
    const mapped = mapFaceitMatch(faceitMatch);
    const enriched = enrichStatsWithSteamIds(mapped);

    const competitionId = faceitMatch.competition_id || undefined;
    await saveFaceitMatch(enriched, competitionId);

    // Tentar vincular a um campeonato ORBITAL ROXA
    if (competitionId) {
      const tournament = await findTournamentByFaceitChampionship(competitionId);
      if (tournament) {
        const { team1_id, team2_id } = await findG5TeamsFromSteamIds(enriched);
        if (team1_id && team2_id) {
          await linkFaceitMatchToBracket(tournament, matchId, team1_id, team2_id);
        }
      }
    }

    console.log(`[FACEIT] Match READY: ${enriched.team1_name} vs ${enriched.team2_name}`);
  } catch (err) {
    console.error("[FACEIT] Error handling match ready:", err);
  }
}

// ── Match finalizada — sync para G5API + avançar bracket ──

async function handleMatchFinished(matchId: string) {
  try {
    const [faceitMatch, faceitStats] = await Promise.all([
      getFaceitMatch(matchId),
      getFaceitMatchStats(matchId),
    ]);

    const mapped = mapFaceitMatch(faceitMatch, faceitStats);
    const enriched = enrichStatsWithSteamIds(mapped);

    const competitionId = faceitMatch.competition_id || undefined;
    await saveFaceitMatch(enriched, competitionId);

    console.log(
      `[FACEIT] Match FINISHED: ${enriched.team1_name} ${enriched.team1_score}-${enriched.team2_score} ${enriched.team2_name}`
    );

    // Encontrar campeonato ORBITAL ROXA vinculado
    let seasonId: number | null = null;
    let tournament = competitionId
      ? await findTournamentByFaceitChampionship(competitionId)
      : null;

    if (tournament) {
      seasonId = tournament.season_id;
    }

    // Sync para G5API (criar match + stats)
    const result = await syncFaceitMatchToG5API(enriched, seasonId);

    if (result.g5_match_id && tournament) {
      // Determinar o winner_id no G5API
      const { team1_id, team2_id } = await findG5TeamsFromSteamIds(enriched);
      const winnerId =
        enriched.winner === "team1" ? team1_id : enriched.winner === "team2" ? team2_id : null;

      if (winnerId) {
        await autoAdvanceTournamentBracket(matchId, result.g5_match_id, winnerId);
      }
    }

    if (result.error) {
      console.warn(`[FACEIT SYNC] Warning: ${result.error}`);
    }
  } catch (err) {
    console.error("[FACEIT] Error handling match finished:", err);
  }
}

// ── Match cancelada ──

async function handleMatchCancelled(matchId: string) {
  try {
    const faceitMatch = await getFaceitMatch(matchId);
    const mapped = mapFaceitMatch(faceitMatch);
    const enriched = enrichStatsWithSteamIds(mapped);

    const competitionId = faceitMatch.competition_id || undefined;
    await saveFaceitMatch(enriched, competitionId);

    console.log(`[FACEIT] Match CANCELLED: ${matchId}`);
  } catch (err) {
    console.error("[FACEIT] Error handling match cancelled:", err);
  }
}

// ── Demo disponível ──

async function handleDemoReady(matchId: string) {
  try {
    const faceitMatch = await getFaceitMatch(matchId);
    const mapped = mapFaceitMatch(faceitMatch);
    const enriched = enrichStatsWithSteamIds(mapped);

    await saveFaceitMatch(enriched);

    if (enriched.demo_urls.length > 0) {
      console.log(`[FACEIT] Demo READY for ${matchId}: ${enriched.demo_urls.length} demo(s)`);
      // TODO: Disparar pipeline de highlights (download demo → parse → record → upload)
    }
  } catch (err) {
    console.error("[FACEIT] Error handling demo ready:", err);
  }
}
