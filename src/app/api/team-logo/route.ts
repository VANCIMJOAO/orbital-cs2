import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";

export async function PUT(req: NextRequest) {
  // Auth check: require admin session cookie
  const cookie = req.cookies.get("G5API")?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
