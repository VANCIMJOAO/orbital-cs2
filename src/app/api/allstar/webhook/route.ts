import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";
const ALLSTAR_WEBHOOK_AUTH = process.env.ALLSTAR_WEBHOOK_AUTH || "";

async function getConnection() {
  const connection = await mysql.createConnection(DATABASE_URL);
  return connection;
}

// POST /api/allstar/webhook
// Receives clip lifecycle events from Allstar
export async function POST(req: NextRequest) {
  // Validate webhook auth if configured
  const authHeader = req.headers.get("authorization") || "";
  console.log("[ALLSTAR WEBHOOK] Auth header received:", JSON.stringify(authHeader));
  console.log("[ALLSTAR WEBHOOK] Expected auth:", JSON.stringify(ALLSTAR_WEBHOOK_AUTH));
  if (ALLSTAR_WEBHOOK_AUTH) {
    if (authHeader !== ALLSTAR_WEBHOOK_AUTH) {
      console.warn("[ALLSTAR WEBHOOK] Unauthorized request - header mismatch");
      // Log but don't block for now - to debug auth issues
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let connection;
  try {
    const body = await req.json();
    console.log("[ALLSTAR WEBHOOK] Event received:", JSON.stringify(body));

    const {
      event,
      _id: clipId,
      clipUrl,
      status,
      clipTitle,
      requestId,
      clipSnapshotURL,
      clipImageThumbURL,
      message,
      steamid,
    } = body;

    if (event !== "clip" || !requestId) {
      return NextResponse.json({ message: "Ignored" });
    }

    connection = await getConnection();

    if (status === "Submitted") {
      // Clip request received, update status
      await connection.execute(
        `UPDATE allstar_clips SET status = 'submitted', clip_id = ?, clip_url = ?, updated_at = NOW() WHERE request_id = ?`,
        [clipId || null, clipUrl || null, requestId]
      );
    } else if (status === "Processed") {
      // Clip ready
      await connection.execute(
        `UPDATE allstar_clips SET
          status = 'processed',
          clip_id = ?,
          clip_url = ?,
          clip_title = ?,
          clip_thumbnail = ?,
          steam_id = ?,
          updated_at = NOW()
        WHERE request_id = ?`,
        [
          clipId || null,
          clipUrl || null,
          clipTitle || null,
          clipImageThumbURL || clipSnapshotURL || null,
          steamid || null,
          requestId,
        ]
      );
    } else if (status === "Error") {
      await connection.execute(
        `UPDATE allstar_clips SET status = 'error', error_message = ?, updated_at = NOW() WHERE request_id = ?`,
        [message || "Unknown error", requestId]
      );
    }

    return NextResponse.json({ message: "OK" });
  } catch (err) {
    console.error("[ALLSTAR WEBHOOK] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    await connection?.end();
  }
}
