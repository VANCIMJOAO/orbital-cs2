import { NextRequest, NextResponse } from "next/server";

const G5API_URL = process.env.NEXT_PUBLIC_G5API_URL || process.env.G5API_URL || "http://localhost:3301";

// GET /api/highlights/clips?matchId=19
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ clips: [], error: "matchId is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${G5API_URL}/highlights/${matchId}`, {
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[HIGHLIGHTS CLIPS]", err);
    return NextResponse.json({ clips: [], error: "Failed to fetch highlights" }, { status: 500 });
  }
}
