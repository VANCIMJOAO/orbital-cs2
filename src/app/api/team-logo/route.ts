import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { checkAdmin } from "../brand/auth";

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { teamId, logoUrl } = await req.json();

    if (!teamId || typeof teamId !== "number") {
      return NextResponse.json({ error: "teamId é obrigatório" }, { status: 400 });
    }

    await dbPool.execute("UPDATE team SET logo = ? WHERE id = ?", [logoUrl || null, teamId]);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar logo";
    console.error("[TEAM-LOGO ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
