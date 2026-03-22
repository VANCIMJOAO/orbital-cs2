import { NextRequest, NextResponse } from "next/server";
import { getFaceitMatchFromDB } from "@/lib/faceit-db";
import { getFaceitMatch, getFaceitMatchStats } from "@/lib/faceit";
import { mapFaceitMatch, enrichStatsWithSteamIds } from "@/lib/faceit-mapper";
import { saveFaceitMatch } from "@/lib/faceit-db";
import { syncFaceitMatchToG5API } from "@/lib/faceit-sync";
import { checkAdmin } from "../../brand/auth";

// POST — sync uma partida Faceit finalizada para o G5API
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { faceit_match_id, season_id } = await req.json();

    if (!faceit_match_id || typeof faceit_match_id !== "string") {
      return NextResponse.json({ error: "faceit_match_id é obrigatório" }, { status: 400 });
    }

    // Buscar dados atualizados da Faceit API (não do cache DB)
    const faceitMatch = await getFaceitMatch(faceit_match_id);

    if (faceitMatch.status !== "FINISHED") {
      return NextResponse.json({ error: "Partida ainda não finalizou na Faceit" }, { status: 400 });
    }

    let faceitStats = null;
    try {
      faceitStats = await getFaceitMatchStats(faceit_match_id);
    } catch {
      return NextResponse.json({ error: "Stats não disponíveis ainda. Tente novamente em alguns minutos." }, { status: 400 });
    }

    const mapped = mapFaceitMatch(faceitMatch, faceitStats);
    const enriched = enrichStatsWithSteamIds(mapped);

    // Atualizar no DB local
    await saveFaceitMatch(enriched);

    // Sync para G5API
    const result = await syncFaceitMatchToG5API(enriched, season_id || null);

    if (result.error) {
      return NextResponse.json({ error: result.error, g5_match_id: result.g5_match_id }, { status: result.g5_match_id ? 200 : 400 });
    }

    return NextResponse.json({ g5_match_id: result.g5_match_id, match: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao sincronizar";
    console.error("[FACEIT SYNC API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
