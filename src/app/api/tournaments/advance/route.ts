import { NextRequest, NextResponse } from "next/server";
import { getTournamentsFromDB, saveTournamentToDB } from "@/lib/tournaments-db";
import { autoAdvanceTournament, type MatchFetcher } from "@/lib/tournament-utils";
import { getMatch } from "@/lib/api";

// Sincroniza o bracket com o G5API — SERVER-SIDE.
//
// Restaura o comportamento do Cup #1 (bracket avança sozinho com o site aberto
// por QUALQUER visitante) sem reabrir a vulnerabilidade que existia na época:
// aqui o cliente não manda dado nenhum — só "aperta a campainha". Quem confere
// o placar é o SERVIDOR, direto no G5API (fonte da verdade), e só ele decide
// o vencedor e salva. O pior que uma chamada maliciosa consegue é avançar o
// bracket corretamente. Idempotente e barato (só trabalha se houver match live).
//
// POST { tournamentId? }  → sincroniza um torneio (ou todos os ativos)
// GET  ?tournament_id=    → mesmo efeito (pra cron/health-check)

const serverFetcher: MatchFetcher = async (matchId) => {
  try {
    const { match } = await getMatch(matchId);
    if (!match) return null;
    return {
      end_time: match.end_time ?? null,
      winner: match.winner ?? null,
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      team1_score: match.team1_score,
      team2_score: match.team2_score,
    };
  } catch {
    return null;
  }
};

async function advance(tournamentId: string | null) {
  const tournaments = await getTournamentsFromDB();
  const targets = tournaments.filter(t =>
    t.status !== "finished" &&
    (!tournamentId || t.id === tournamentId) &&
    t.matches.some(m => m.status === "live" && m.match_id)
  );

  const advanced: string[] = [];
  for (const t of targets) {
    try {
      const result = await autoAdvanceTournament(t, serverFetcher);
      if (result.changed) {
        const ok = await saveTournamentToDB(result.tournament);
        if (ok) advanced.push(t.id);
      }
    } catch (err) {
      console.error("[TOURNAMENTS ADVANCE]", t.id, err);
    }
  }
  return { checked: targets.length, advanced };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId : null;
    const result = await advance(tournamentId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[TOURNAMENTS ADVANCE POST]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tournamentId = req.nextUrl.searchParams.get("tournament_id");
    const result = await advance(tournamentId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[TOURNAMENTS ADVANCE GET]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}
