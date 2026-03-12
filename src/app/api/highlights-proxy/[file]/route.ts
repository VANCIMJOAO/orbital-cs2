import { NextRequest, NextResponse } from "next/server";

const G5API_URL = process.env.NEXT_PUBLIC_G5API_URL || process.env.G5API_URL || "https://g5api-production-998f.up.railway.app";

// GET /api/highlights-proxy/[file]
// Proxies highlight video/thumbnail files from G5API
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!file) {
    return NextResponse.json({ error: "File not specified" }, { status: 400 });
  }

  try {
    const res = await fetch(`${G5API_URL}/highlights-files/${encodeURIComponent(file)}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const contentType = file.endsWith(".mp4")
      ? "video/mp4"
      : file.endsWith(".jpg") || file.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[HIGHLIGHTS PROXY]", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
