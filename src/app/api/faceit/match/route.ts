import { NextRequest, NextResponse } from "next/server";
import { getFaceitMatch, getFaceitMatchStats } from "@/lib/faceit";
import { mapFaceitMatch, enrichStatsWithSteamIds } from "@/lib/faceit-mapper";
import { saveFaceitMatch, getAllFaceitMatches } from "@/lib/faceit-db";
import { checkAdmin } from "../../brand/auth";

// GET — listar todas as partidas Faceit salvas
export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get("tournament_id") || undefined;
  try {
    const matches = await getAllFaceitMatches(tournamentId);
    return NextResponse.json({ matches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — importar partida da Faceit manualmente (admin)
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { faceit_match_id, tournament_id } = await req.json();

    if (!faceit_match_id || typeof faceit_match_id !== "string") {
      return NextResponse.json({ error: "faceit_match_id é obrigatório" }, { status: 400 });
    }

    // Buscar dados da Faceit
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
    const message = err instanceof Error ? err.message : "Erro ao importar partida Faceit";
    console.error("[FACEIT IMPORT ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
