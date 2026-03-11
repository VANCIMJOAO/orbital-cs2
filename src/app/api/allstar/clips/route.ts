import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";

async function getConnection() {
  const connection = await mysql.createConnection(DATABASE_URL);
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

// GET /api/allstar/clips?matchId=19&mapNumber=0
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  const mapNumber = req.nextUrl.searchParams.get("mapNumber");

  let connection;
  try {
    connection = await getConnection();

    let query = "SELECT * FROM allstar_clips WHERE 1=1";
    const params: (string | number)[] = [];

    if (matchId) {
      query += " AND match_id = ?";
      params.push(Number(matchId));
    }
    if (mapNumber !== null && mapNumber !== undefined) {
      query += " AND map_number = ?";
      params.push(Number(mapNumber));
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await connection.execute(query, params);
    return NextResponse.json({ clips: rows });
  } catch (err) {
    console.error("[ALLSTAR CLIPS GET]", err);
    return NextResponse.json({ clips: [], error: "Failed to fetch clips" }, { status: 500 });
  } finally {
    await connection?.end();
  }
}
