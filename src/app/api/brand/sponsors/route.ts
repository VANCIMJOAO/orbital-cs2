import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute("SELECT * FROM brand_sponsors ORDER BY created_at DESC");
    return NextResponse.json({ sponsors: rows });
  } catch (err) {
    console.error("[BRAND SPONSORS GET]", err);
    return NextResponse.json({ sponsors: [] });
  }
}

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { name, type, value, status, notes } = await req.json();
    const [result] = await dbPool.execute(
      "INSERT INTO brand_sponsors (name, type, value, status, notes) VALUES (?, ?, ?, ?, ?)",
      [name, type || null, value || null, status || "prospect", notes || null]
    );
    const insertId = (result as { insertId: number }).insertId;
    return NextResponse.json({ id: insertId }, { status: 201 });
  } catch (err) {
    console.error("[BRAND SPONSORS POST]", err);
    return NextResponse.json({ error: "Erro ao criar sponsor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { id, name, type, value, status, notes } = await req.json();
    await dbPool.execute(
      "UPDATE brand_sponsors SET name = ?, type = ?, value = ?, status = ?, notes = ? WHERE id = ?",
      [name, type || null, value || null, status, notes || null, id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND SPONSORS PUT]", err);
    return NextResponse.json({ error: "Erro ao atualizar sponsor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    await dbPool.execute("DELETE FROM brand_sponsors WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND SPONSORS DELETE]", err);
    return NextResponse.json({ error: "Erro ao deletar sponsor" }, { status: 500 });
  }
}
