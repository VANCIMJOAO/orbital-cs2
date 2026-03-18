import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute("SELECT * FROM brand_posts ORDER BY scheduled_for DESC");
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
    const { title, caption, post_type, hashtags, scheduled_for } = await req.json();
    const [result] = await dbPool.execute(
      "INSERT INTO brand_posts (title, caption, post_type, hashtags, scheduled_for) VALUES (?, ?, ?, ?, ?)",
      [title, caption || null, post_type || "feed", hashtags ? JSON.stringify(hashtags) : null, scheduled_for || null]
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
    const { id, title, caption, post_type, hashtags, scheduled_for, posted, posted_at, instagram_url } = await req.json();

    if (typeof posted === "boolean" && title === undefined) {
      // Toggle posted status only
      await dbPool.execute(
        "UPDATE brand_posts SET posted = ?, posted_at = ? WHERE id = ?",
        [posted, posted ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, id]
      );
    } else {
      await dbPool.execute(
        "UPDATE brand_posts SET title = ?, caption = ?, post_type = ?, hashtags = ?, scheduled_for = ?, posted = ?, posted_at = ?, instagram_url = ? WHERE id = ?",
        [title, caption || null, post_type || "feed", hashtags ? JSON.stringify(hashtags) : null, scheduled_for || null, posted || false, posted_at || null, instagram_url || null, id]
      );
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
