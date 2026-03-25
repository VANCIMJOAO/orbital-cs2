import { NextRequest, NextResponse } from "next/server";
import { G5API_URL } from "@/lib/constants";

// GET /api/highlights/player/[steamId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ steamId: string }> }
) {
  const { steamId } = await params;

  if (!steamId) {
    return NextResponse.json({ clips: [] }, { status: 400 });
  }

  try {
    const res = await fetch(`${G5API_URL}/highlights/player/${steamId}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[HIGHLIGHTS PLAYER]", err);
    return NextResponse.json({ clips: [], error: "Failed to fetch player highlights" }, { status: 500 });
  }
}
