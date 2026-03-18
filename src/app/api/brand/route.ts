import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "./init-db";
import { checkAdmin } from "./auth";

export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();

    const [tasks] = await dbPool.execute("SELECT * FROM brand_tasks ORDER BY category, id");
    const [checklist] = await dbPool.execute("SELECT * FROM brand_checklist ORDER BY category, id");
    const [sponsors] = await dbPool.execute("SELECT * FROM brand_sponsors ORDER BY created_at DESC");
    const [posts] = await dbPool.execute("SELECT * FROM brand_posts ORDER BY scheduled_for DESC");
    const [notes] = await dbPool.execute("SELECT * FROM brand_notes ORDER BY section");

    return NextResponse.json({ tasks, checklist, sponsors, posts, notes });
  } catch (err) {
    console.error("[BRAND GET]", err);
    return NextResponse.json({ error: "Erro ao carregar dados" }, { status: 500 });
  }
}
