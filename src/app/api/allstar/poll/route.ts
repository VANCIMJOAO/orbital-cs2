import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";
const ALLSTAR_API_KEY = process.env.ALLSTAR_SERVER_API_KEY || "";
const ALLSTAR_API_URL = "https://prt.allstar.gg";

async function getConnection() {
  return mysql.createConnection(DATABASE_URL);
}

// POST /api/allstar/poll
// Polls Allstar API to check status of pending clips and updates DB
export async function POST(req: NextRequest) {
  let connection;
  try {
    const body = await req.json().catch(() => ({}));
    const matchId = body.matchId;

    connection = await getConnection();

    // Get pending/submitted clips
    let query = "SELECT * FROM allstar_clips WHERE status IN ('pending', 'submitted')";
    const params: number[] = [];
    if (matchId) {
      query += " AND match_id = ?";
      params.push(Number(matchId));
    }

    const [rows] = await connection.execute(query, params) as [AllstarClipRow[], unknown];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: "No pending clips", updated: 0 });
    }

    let updated = 0;

    // Check each pending clip via Allstar /cs/clips endpoint
    // We search by our clips to see if any have been processed
    const res = await fetch(`${ALLSTAR_API_URL}/cs/clips?limit=20`, {
      headers: { "X-Api-Key": ALLSTAR_API_KEY },
    });
    const allstarData = await res.json();
    const allstarClips = allstarData?.data?.clips || [];

    // Build a lookup of allstar clips by requestId
    const clipsByRequestId = new Map<string, AllstarClipData>();
    for (const clip of allstarClips) {
      if (clip.requestId) {
        clipsByRequestId.set(clip.requestId, clip);
      }
    }

    for (const row of rows) {
      if (!row.request_id) continue;

      const allstarClip = clipsByRequestId.get(row.request_id);
      if (!allstarClip) continue;

      const newStatus = allstarClip.status === "Processed" ? "processed"
        : allstarClip.status === "Error" ? "error"
        : allstarClip.status === "Submitted" ? "submitted"
        : null;

      if (newStatus && newStatus !== row.status) {
        await connection.execute(
          `UPDATE allstar_clips SET
            status = ?,
            clip_id = ?,
            clip_url = ?,
            clip_title = ?,
            clip_thumbnail = ?,
            steam_id = ?,
            error_message = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [
            newStatus,
            allstarClip._id || null,
            allstarClip.clipUrl || null,
            allstarClip.clipTitle || null,
            allstarClip.clipImageThumbURL || allstarClip.clipSnapshotURL || null,
            allstarClip.steamid || null,
            allstarClip.status === "Error" ? (allstarClip.message || "Unknown error") : null,
            row.id,
          ]
        );
        updated++;
      }
    }

    return NextResponse.json({ message: "Poll complete", updated, totalPending: rows.length });
  } catch (err) {
    console.error("[ALLSTAR POLL] Error:", err);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  } finally {
    await connection?.end();
  }
}

interface AllstarClipRow {
  id: number;
  request_id: string | null;
  status: string;
}

interface AllstarClipData {
  _id?: string;
  requestId?: string;
  status: string;
  clipUrl?: string;
  clipTitle?: string;
  clipImageThumbURL?: string;
  clipSnapshotURL?: string;
  steamid?: string;
  message?: string;
}
