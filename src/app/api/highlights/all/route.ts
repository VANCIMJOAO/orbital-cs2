import { NextRequest, NextResponse } from "next/server";
import { G5API_URL } from "@/lib/constants";

// GET /api/highlights/all?limit=30&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "30";
    const offset = searchParams.get("offset") || "0";

    const res = await fetch(`${G5API_URL}/highlights/all?limit=${limit}&offset=${offset}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ clips: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[HIGHLIGHTS ALL]", err);
    return NextResponse.json({ clips: [], error: "Failed to fetch highlights" }, { status: 500 });
  }
}
