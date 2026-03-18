import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute("SELECT * FROM brand_tasks ORDER BY category, id");
    return NextResponse.json({ tasks: rows });
  } catch (err) {
    console.error("[BRAND TASKS GET]", err);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { category, title, description, due_date } = await req.json();
    const [result] = await dbPool.execute(
      "INSERT INTO brand_tasks (category, title, description, due_date) VALUES (?, ?, ?, ?)",
      [category, title, description || null, due_date || null]
    );
    const insertId = (result as { insertId: number }).insertId;
    return NextResponse.json({ id: insertId }, { status: 201 });
  } catch (err) {
    console.error("[BRAND TASKS POST]", err);
    return NextResponse.json({ error: "Erro ao criar task" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { id, done, title, description, due_date } = await req.json();

    if (typeof done === "boolean") {
      await dbPool.execute("UPDATE brand_tasks SET done = ? WHERE id = ?", [done, id]);
    }
    if (title !== undefined) {
      await dbPool.execute(
        "UPDATE brand_tasks SET title = ?, description = ?, due_date = ? WHERE id = ?",
        [title, description || null, due_date || null, id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND TASKS PUT]", err);
    return NextResponse.json({ error: "Erro ao atualizar task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    await dbPool.execute("DELETE FROM brand_tasks WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND TASKS DELETE]", err);
    return NextResponse.json({ error: "Erro ao deletar task" }, { status: 500 });
  }
}
