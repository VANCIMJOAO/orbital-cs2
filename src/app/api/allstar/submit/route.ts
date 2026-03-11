import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";
const ALLSTAR_API_KEY = process.env.ALLSTAR_SERVER_API_KEY || "ffd47a65-70b1-4a8c-8293-2191dfa8a3ab";
const ALLSTAR_API_URL = "https://prt.allstar.gg";
const G5API_URL = process.env.G5API_URL || process.env.NEXT_PUBLIC_G5API_URL || "https://g5api-production-998f.up.railway.app";

// Webhook URL: where Allstar sends clip events back to us
// In production, this should be your public domain
const WEBHOOK_BASE = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3001";

async function getConnection() {
  const connection = await mysql.createConnection(DATABASE_URL);
  // Ensure table exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS allstar_clips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      match_id INT NOT NULL,
      map_number INT NOT NULL DEFAULT 0,
      request_id VARCHAR(255),
      clip_id VARCHAR(255),
      clip_url VARCHAR(512),
      clip_title VARCHAR(255),
      clip_thumbnail VARCHAR(512),
      steam_id VARCHAR(64),
      status ENUM('pending', 'submitted', 'processed', 'error') DEFAULT 'pending',
      error_message TEXT,
      demo_url VARCHAR(512),
      use_case VARCHAR(32) DEFAULT 'POTG',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_request (request_id),
      INDEX idx_match (match_id, map_number),
      INDEX idx_status (status)
    )
  `).catch(() => {});
  return connection;
}

// POST /api/allstar/submit
// Body: { matchId: number, mapNumber: number, demoFile: string, useCase?: string }
export async function POST(req: NextRequest) {
  let connection;
  try {
    const body = await req.json();
    const { matchId, mapNumber = 0, demoFile, useCase = "POTG" } = body;

    if (!matchId || !demoFile) {
      return NextResponse.json({ error: "matchId and demoFile are required" }, { status: 400 });
    }

    // Build the public demo URL that Allstar can download
    const demoUrl = `${G5API_URL}/demo/${encodeURIComponent(demoFile)}`;
    const webhookUrl = `${WEBHOOK_BASE}/api/allstar/webhook`;

    // Map use case to Allstar endpoint
    const useCaseEndpoints: Record<string, string> = {
      POTG: "/cs/clip/potg",
      BP: "/cs/clip/bp",
      PMH: "/cs/clip/pmh",
      MH: "/cs/clip/mh",
      SH: "/cs/clip/sh",
    };

    const endpoint = useCaseEndpoints[useCase] || useCaseEndpoints.POTG;

    // Send to Allstar
    const allstarRes = await fetch(`${ALLSTAR_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": ALLSTAR_API_KEY,
      },
      body: JSON.stringify({
        demoUrl,
        webhookUrl,
        metadata: [
          { key: "matchId", value: String(matchId) },
          { key: "mapNumber", value: String(mapNumber) },
          { key: "source", value: "ORBITAL ROXA" },
        ],
      }),
    });

    const allstarData = await allstarRes.json();
    console.log("[ALLSTAR SUBMIT] Response:", allstarRes.status, JSON.stringify(allstarData));

    if (!allstarRes.ok) {
      return NextResponse.json(
        { error: allstarData.message || "Allstar API error", details: allstarData },
        { status: allstarRes.status }
      );
    }

    const requestId = allstarData.requestId;

    // Store in DB
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO allstar_clips (match_id, map_number, request_id, demo_url, use_case, status)
       VALUES (?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE demo_url = VALUES(demo_url), status = 'pending', updated_at = NOW()`,
      [matchId, mapNumber, requestId, demoUrl, useCase]
    );

    return NextResponse.json({
      message: "Clip request submitted to Allstar",
      requestId,
      demoUrl,
      webhookUrl,
    });
  } catch (err) {
    console.error("[ALLSTAR SUBMIT] Error:", err);
    return NextResponse.json({ error: "Failed to submit to Allstar" }, { status: 500 });
  } finally {
    await connection?.end();
  }
}
