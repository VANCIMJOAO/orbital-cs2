import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { Tournament } from "@/lib/tournament";

const DATABASE_URL = process.env.DATABASE_URL || "";

async function getConnection() {
  const connection = await mysql.createConnection(DATABASE_URL);
  // Ensure tournaments table exists
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tournament (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  return connection;
}

export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute("SELECT id, data FROM tournament ORDER BY created_at DESC");
    const tournaments: Tournament[] = (rows as { id: string; data: string }[]).map(row =>
      typeof row.data === "string" ? JSON.parse(row.data) : row.data
    );
    return NextResponse.json({ tournaments });
  } catch (err) {
    console.error("[TOURNAMENTS GET]", err);
    return NextResponse.json({ tournaments: [] });
  } finally {
    await connection?.end();
  }
}

export async function POST(req: NextRequest) {
  let connection;
  try {
    const tournament: Tournament = await req.json();
    connection = await getConnection();
    await connection.execute(
      "INSERT INTO tournament (id, name, data) VALUES (?, ?, ?)",
      [tournament.id, tournament.name, JSON.stringify(tournament)]
    );
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    console.error("[TOURNAMENTS POST]", err);
    const message = err instanceof Error ? err.message : "Erro ao criar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await connection?.end();
  }
}

export async function PUT(req: NextRequest) {
  let connection;
  try {
    const updated: Tournament = await req.json();
    connection = await getConnection();
    const [result] = await connection.execute(
      "UPDATE tournament SET name = ?, data = ? WHERE id = ?",
      [updated.name, JSON.stringify(updated), updated.id]
    );
    const affectedRows = (result as { affectedRows: number }).affectedRows;
    if (affectedRows === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ tournament: updated });
  } catch (err) {
    console.error("[TOURNAMENTS PUT]", err);
    const message = err instanceof Error ? err.message : "Erro ao atualizar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await connection?.end();
  }
}

export async function DELETE(req: NextRequest) {
  let connection;
  try {
    const { id } = await req.json();
    connection = await getConnection();
    await connection.execute("DELETE FROM tournament WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOURNAMENTS DELETE]", err);
    const message = err instanceof Error ? err.message : "Erro ao deletar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await connection?.end();
  }
}
