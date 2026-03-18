import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const { id, done } = await req.json();
    await dbPool.execute("UPDATE brand_checklist SET done = ? WHERE id = ?", [done, id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[BRAND CHECKLIST TOGGLE]", err);
    return NextResponse.json({ error: "Erro ao atualizar checklist" }, { status: 500 });
  }
}
