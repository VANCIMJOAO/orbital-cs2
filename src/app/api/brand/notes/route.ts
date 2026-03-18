import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute("SELECT * FROM brand_notes ORDER BY section");
    return NextResponse.json({ notes: rows });
  } catch (err) {
    console.error("[BRAND NOTES GET]", err);
    return NextResponse.json({ notes: [] });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { section, content } = await req.json();

    // Upsert: update if exists, insert if not
    const [existing] = await dbPool.execute(
      "SELECT id FROM brand_notes WHERE section = ?",
      [section]
    );
    const rows = existing as { id: number }[];

    if (rows.length > 0) {
      await dbPool.execute(
        "UPDATE brand_notes SET content = ? WHERE section = ?",
        [content, section]
      );
    } else {
      await dbPool.execute(
        "INSERT INTO brand_notes (section, content) VALUES (?, ?)",
        [section, content]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND NOTES PUT]", err);
    return NextResponse.json({ error: "Erro ao salvar nota" }, { status: 500 });
  }
}
