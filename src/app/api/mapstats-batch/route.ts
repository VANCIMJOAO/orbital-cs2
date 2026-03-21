import { NextRequest, NextResponse } from "next/server";
import { getMapStats, parseMapStats, MapStats } from "@/lib/api";

// GET /api/mapstats-batch?ids=19,31,32,33
// Returns all mapstats for multiple matches in a single request
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ error: "ids parameter required" }, { status: 400 });
  }

  const ids = idsParam.split(",").map(Number).filter(n => !isNaN(n) && n > 0).slice(0, 50); // max 50

  if (ids.length === 0) {
    return NextResponse.json({ mapStats: {} });
  }

  const result: Record<number, MapStats[]> = {};

  // Fetch in parallel (batched)
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const raw = await getMapStats(id);
          const parsed = parseMapStats(raw as unknown as Record<string, unknown>);
          return { id, stats: parsed as MapStats[] };
        } catch {
          return { id, stats: [] as MapStats[] };
        }
      })
    );
    for (const r of results) {
      result[r.id] = r.stats;
    }
  }

  return NextResponse.json(
    { mapStats: result },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
