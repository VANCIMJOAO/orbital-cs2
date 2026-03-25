import { NextRequest, NextResponse } from "next/server";
import { G5API_URL } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  // G5API serves demos at /demo/{filename}
  return NextResponse.redirect(`${G5API_URL}/demo/${encodeURIComponent(filename)}`);
}
