import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "../../brand/auth";
import { G5API_URL } from "@/lib/constants";

const HIGHLIGHTS_KEY = process.env.HIGHLIGHTS_API_KEY;

// POST /api/highlights/trigger
// Body: { matchId: number, mapNumber?: number }
// Auth: checkAdmin or X-Highlights-Key header (for automated pipeline)
export async function POST(req: NextRequest) {
  try {
    // Check auth: admin validated against G5API, or API key for automation
    const apiKey = req.headers.get("X-Highlights-Key");
    if (HIGHLIGHTS_KEY && apiKey === HIGHLIGHTS_KEY) {
      // API key auth — valid for automated pipeline
    } else {
      const authError = await checkAdmin(req);
      if (authError) return authError;
    }

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
