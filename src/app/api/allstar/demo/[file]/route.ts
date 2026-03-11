import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

const G5API_URL = process.env.G5API_URL || process.env.NEXT_PUBLIC_G5API_URL || "https://g5api-production-998f.up.railway.app";

// GET /api/allstar/demo/[file]
// Downloads a .zip demo from G5API, extracts the .dem file, and serves it
// This is needed because Allstar expects .dem files, not .zip
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;

    if (!file) {
      return NextResponse.json({ error: "File parameter required" }, { status: 400 });
    }

    // Ensure the file ends with .dem (we'll fetch the .zip version)
    const zipFile = file.endsWith(".dem")
      ? file.replace(/\.dem$/, ".zip")
      : file.endsWith(".zip")
        ? file
        : `${file}.zip`;

    const demFileName = zipFile.replace(/\.zip$/, ".dem");

    console.log(`[ALLSTAR DEMO] Fetching ZIP: ${G5API_URL}/demo/${zipFile}`);

    // Download the ZIP from G5API
    const zipRes = await fetch(`${G5API_URL}/demo/${encodeURIComponent(zipFile)}`);

    if (!zipRes.ok) {
      console.error(`[ALLSTAR DEMO] G5API returned ${zipRes.status}`);
      return NextResponse.json(
        { error: `Demo not found: ${zipRes.status}` },
        { status: zipRes.status }
      );
    }

    const zipBuffer = await zipRes.arrayBuffer();

    // Extract the .dem file from the ZIP
    const zip = await JSZip.loadAsync(zipBuffer);

    // Find the .dem file inside the ZIP
    let demFile: JSZip.JSZipObject | null = null;
    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.endsWith(".dem") && !zipEntry.dir) {
        demFile = zipEntry;
      }
    });

    if (!demFile) {
      return NextResponse.json({ error: "No .dem file found in ZIP" }, { status: 404 });
    }

    const demBuffer = await (demFile as JSZip.JSZipObject).async("arraybuffer");

    console.log(`[ALLSTAR DEMO] Serving ${demFileName} (${demBuffer.byteLength} bytes)`);

    return new NextResponse(demBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${demFileName}"`,
        "Content-Length": String(demBuffer.byteLength),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[ALLSTAR DEMO] Error:", err);
    return NextResponse.json({ error: "Failed to extract demo" }, { status: 500 });
  }
}
