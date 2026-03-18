import { NextRequest, NextResponse } from "next/server";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-894e2fa8c7684e2095cedd60a72f4536.r2.dev";

// GET /api/highlights-proxy/[file]
// Redirects to Cloudflare R2 for highlight videos and thumbnails
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!file) {
    return NextResponse.json({ error: "File not specified" }, { status: 400 });
  }

  const url = `${R2_PUBLIC_URL}/highlights/${encodeURIComponent(file)}`;

  // Redirect to R2 (CDN cached, fast globally)
  return NextResponse.redirect(url);
}
