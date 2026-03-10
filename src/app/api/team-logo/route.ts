import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";

export async function PUT(req: NextRequest) {
  try {
    const { teamId, logoUrl } = await req.json();

    if (!teamId || typeof teamId !== "number") {
      return NextResponse.json({ error: "teamId é obrigatório" }, { status: 400 });
    }

    const connection = await mysql.createConnection(DATABASE_URL);
    await connection.execute("UPDATE team SET logo = ? WHERE id = ?", [logoUrl || null, teamId]);
    await connection.end();

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar logo";
    console.error("[TEAM-LOGO ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
