import { NextRequest, NextResponse } from "next/server";

const STEAM_API_KEY = process.env.STEAM_API_KEY || "B7120E9E2297DA4659901D845619D598";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ steamId: string }> }
) {
  const { steamId } = await params;

  try {
    // Step 1: Get the avatarfull URL from Steam Web API
    const summaryRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`,
      { next: { revalidate: 3600 } }
    );
    const summaryData = await summaryRes.json();
    const player = summaryData.response?.players?.[0];

    if (!player?.avatarfull) {
      return new NextResponse(null, { status: 404 });
    }

    // Step 2: Fetch the actual image bytes
    const imageRes = await fetch(player.avatarfull);
    if (!imageRes.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";

    // Step 3: Return image with cache headers (1 hour)
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
