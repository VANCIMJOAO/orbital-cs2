import mysql from "mysql2/promise";
import { Tournament } from "./tournament";

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.warn("[ORBITAL] WARNING: DATABASE_URL not set. Tournament features will not work.");
}

// Use globalThis to prevent pool duplication during hot-reload in dev
const globalForDb = globalThis as unknown as { _dbPool?: mysql.Pool };
export const dbPool = globalForDb._dbPool || mysql.createPool({
  uri: DATABASE_URL,
  connectionLimit: 5,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 20,
});
if (!globalForDb._dbPool) globalForDb._dbPool = dbPool;

let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS tournament (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch { /* ignore - table may already exist */ }
  tableEnsured = true;
}

export async function getTournamentsFromDB(): Promise<Tournament[]> {
  try {
    await ensureTable();
    const [rows] = await dbPool.execute("SELECT id, data FROM tournament ORDER BY created_at DESC");
    return (rows as { id: string; data: string }[]).map(row =>
      typeof row.data === "string" ? JSON.parse(row.data) : row.data
    );
  } catch (err) {
    console.error("[TOURNAMENTS DB]", err);
    return [];
  }
}

export async function saveTournamentToDB(tournament: Tournament): Promise<boolean> {
  try {
    await ensureTable();
    await dbPool.execute(
      "UPDATE tournament SET name = ?, data = ? WHERE id = ?",
      [tournament.name, JSON.stringify(tournament), tournament.id]
    );
    return true;
  } catch (err) {
    console.error("[TOURNAMENTS DB SAVE]", err);
    return false;
  }
}
