import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute("SELECT * FROM brand_posts ORDER BY scheduled_date, scheduled_time");
    return NextResponse.json({ posts: rows });
  } catch (err) {
    console.error("[BRAND POSTS GET]", err);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { title, post_type, scheduled_date, scheduled_time, caption, hashtags, notes } = await req.json();
    const [result] = await dbPool.execute(
      "INSERT INTO brand_posts (title, post_type, scheduled_date, scheduled_time, caption, hashtags, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, post_type || "feed", scheduled_date || null, scheduled_time || null, caption || "", hashtags || "", notes || null]
    );
    const insertId = (result as { insertId: number }).insertId;
    return NextResponse.json({ id: insertId }, { status: 201 });
  } catch (err) {
    console.error("[BRAND POSTS POST]", err);
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const body = await req.json();
    const { id, ...fields } = body;

    if (typeof fields.published === "boolean") {
      await dbPool.execute(
        "UPDATE brand_posts SET published = ?, published_at = ? WHERE id = ?",
        [fields.published, fields.published ? new Date() : null, id]
      );
    }

    const updateFields: string[] = [];
    const updateVals: (string | number | null)[] = [];
    for (const key of ["title", "post_type", "scheduled_date", "scheduled_time", "caption", "hashtags", "notes"]) {
      if (fields[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateVals.push(fields[key]);
      }
    }
    if (updateFields.length > 0) {
      updateVals.push(id);
      await dbPool.execute(`UPDATE brand_posts SET ${updateFields.join(", ")} WHERE id = ?`, updateVals);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND POSTS PUT]", err);
    return NextResponse.json({ error: "Erro ao atualizar post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    await dbPool.execute("DELETE FROM brand_posts WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND POSTS DELETE]", err);
    return NextResponse.json({ error: "Erro ao deletar post" }, { status: 500 });
  }
}
