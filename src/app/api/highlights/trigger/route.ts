import { NextRequest, NextResponse } from "next/server";

const G5API_URL = process.env.NEXT_PUBLIC_G5API_URL || process.env.G5API_URL || "http://localhost:3301";

// POST /api/highlights/trigger
// Body: { matchId: number, mapNumber?: number }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, mapNumber } = body;

    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    const res = await fetch(`${G5API_URL}/highlights/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, mapNumber }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[HIGHLIGHTS TRIGGER]", err);
    return NextResponse.json({ error: "Failed to trigger highlights" }, { status: 500 });
  }
}
