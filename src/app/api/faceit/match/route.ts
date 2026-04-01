import { NextRequest, NextResponse } from "next/server";
import { getFaceitMatch, getFaceitMatchStats } from "@/lib/faceit";
import { mapFaceitMatch, enrichStatsWithSteamIds } from "@/lib/faceit-mapper";
import {
  saveFaceitMatch,
  getAllFaceitMatches,
  getAllChampionships,
  saveChampionship,
  linkChampionshipToTournament,
  deleteChampionship,
} from "@/lib/faceit-db";
import { checkAdmin } from "../../brand/auth";

// GET — listar partidas Faceit salvas OU championships vinculados
export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get("tournament_id") || undefined;
  const wantChampionships = req.nextUrl.searchParams.get("championships");

  try {
    if (wantChampionships) {
      const championships = await getAllChampionships();
      return NextResponse.json({ championships });
    }

    const matches = await getAllFaceitMatches(tournamentId);
    return NextResponse.json({ matches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — ações de championship ou importar partida (admin)
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { action } = body;

    // ── Championship actions ──
    if (action === "save_championship") {
      const { championship_id, name, data, tournament_id } = body;
      if (!championship_id || !name) {
        return NextResponse.json({ error: "championship_id e name são obrigatórios" }, { status: 400 });
      }
      const ok = await saveChampionship(championship_id, name, data || {}, tournament_id);
      if (!ok) return NextResponse.json({ error: "Erro ao salvar championship" }, { status: 500 });
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    if (action === "link_championship") {
      const { championship_id, tournament_id } = body;
      if (!championship_id) {
        return NextResponse.json({ error: "championship_id é obrigatório" }, { status: 400 });
      }
      const ok = await linkChampionshipToTournament(championship_id, tournament_id || "");
      if (!ok) return NextResponse.json({ error: "Erro ao vincular" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_championship") {
      const { championship_id } = body;
      if (!championship_id) {
        return NextResponse.json({ error: "championship_id é obrigatório" }, { status: 400 });
      }
      const ok = await deleteChampionship(championship_id);
      if (!ok) return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── Legacy: importar partida individual ──
    const { faceit_match_id, tournament_id } = body;

    if (!faceit_match_id || typeof faceit_match_id !== "string") {
      return NextResponse.json({ error: "faceit_match_id é obrigatório" }, { status: 400 });
    }

    const faceitMatch = await getFaceitMatch(faceit_match_id);

    let faceitStats = null;
    if (faceitMatch.status === "FINISHED") {
      try {
        faceitStats = await getFaceitMatchStats(faceit_match_id);
      } catch {
        // Stats podem não estar disponíveis ainda
      }
    }

    const mapped = mapFaceitMatch(faceitMatch, faceitStats ?? undefined);
    const enriched = enrichStatsWithSteamIds(mapped);

    await saveFaceitMatch(enriched, tournament_id);

    return NextResponse.json({ match: enriched }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar requisição Faceit";
    console.error("[FACEIT API ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
