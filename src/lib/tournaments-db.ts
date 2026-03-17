import mysql from "mysql2/promise";
import { Tournament } from "./tournament";

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.warn("[ORBITAL] WARNING: DATABASE_URL not set. Tournament features will not work.");
}

export const dbPool = mysql.createPool(DATABASE_URL);

export async function getTournamentsFromDB(): Promise<Tournament[]> {
  try {
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
