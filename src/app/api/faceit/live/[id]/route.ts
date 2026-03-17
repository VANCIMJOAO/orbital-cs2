import { NextRequest, NextResponse } from "next/server";
import { getFaceitMatch } from "@/lib/faceit";

// GET — polling score ao vivo de uma partida Faceit
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const match = await getFaceitMatch(id);

    return NextResponse.json({
      status: match.status,
      score: match.results?.score || null,
      winner: match.results?.winner || null,
      map: match.voting?.map?.pick?.[0] || null,
      teams: {
        faction1: match.teams.faction1.name,
        faction2: match.teams.faction2.name,
      },
      started_at: match.started_at
        ? new Date(match.started_at * 1000).toISOString()
        : null,
      finished_at: match.finished_at
        ? new Date(match.finished_at * 1000).toISOString()
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
