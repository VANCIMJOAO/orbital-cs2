import { NextRequest, NextResponse } from "next/server";
import {
  getFaceitChampionship,
  getFaceitChampionshipMatches,
} from "@/lib/faceit";
import { mapFaceitMatch, enrichStatsWithSteamIds } from "@/lib/faceit-mapper";
import type { FaceitMatch, FaceitMatchStats } from "@/lib/faceit";
import { getFaceitMatchStats } from "@/lib/faceit";

// GET — info do championship + todas as partidas dele (mapeadas)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Info do championship
    const championship = await getFaceitChampionship(id);

    // 2. Buscar todas as partidas (paginado, max 100)
    const allMatches: FaceitMatch[] = [];
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    while (hasMore && offset < 100) {
      const res = await getFaceitChampionshipMatches(id, "all", offset, limit) as { items: FaceitMatch[] };
      const items = res.items || [];
      allMatches.push(...items);
      hasMore = items.length === limit;
      offset += limit;
    }

    // 3. Mapear partidas (buscar stats só das finalizadas)
    const mapped = await Promise.all(
      allMatches.map(async (m) => {
        let stats: FaceitMatchStats | undefined;
        if (m.status === "FINISHED") {
          try {
            stats = await getFaceitMatchStats(m.match_id);
          } catch { /* stats indisponíveis */ }
        }
        const result = mapFaceitMatch(m, stats);
        return enrichStatsWithSteamIds(result);
      })
    );

    return NextResponse.json({
      championship: {
        id: championship.championship_id,
        name: championship.name,
        description: championship.description,
        type: championship.type,
        status: championship.status,
        slots: championship.slots,
        current_subscriptions: championship.current_subscriptions,
        game: championship.game_id,
        region: championship.region,
        faceit_url: championship.faceit_url,
      },
      matches: mapped,
      total: mapped.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
