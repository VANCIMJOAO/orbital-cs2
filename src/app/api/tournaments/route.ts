import { NextRequest, NextResponse } from "next/server";
import { Tournament } from "@/lib/tournament";
import { dbPool as pool } from "@/lib/tournaments-db";

export async function GET() {
  try {
    const [rows] = await pool.execute("SELECT id, data FROM tournament ORDER BY created_at DESC");
    const tournaments: Tournament[] = (rows as { id: string; data: string }[]).map(row =>
      typeof row.data === "string" ? JSON.parse(row.data) : row.data
    );
    return NextResponse.json({ tournaments });
  } catch (err) {
    console.error("[TOURNAMENTS GET]", err);
    return NextResponse.json({ tournaments: [] });
  }
}

const G5API_AUTH_URL =
  process.env.G5API_URL ||
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

async function checkAdmin(req: NextRequest): Promise<NextResponse | null> {
  const cookie = req.cookies.get("G5API")?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const authRes = await fetch(`${G5API_AUTH_URL}/isloggedin`, {
      headers: { Cookie: `G5API=${cookie}` },
    });
    const authData = await authRes.json();
    const user = authData?.user || authData;
    if (!user?.admin && !user?.super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const tournament: Tournament = await req.json();
    await pool.execute(
      "INSERT INTO tournament (id, name, data) VALUES (?, ?, ?)",
      [tournament.id, tournament.name, JSON.stringify(tournament)]
    );
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    console.error("[TOURNAMENTS POST]", err);
    const message = err instanceof Error ? err.message : "Erro ao criar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const updated: Tournament = await req.json();
    const [result] = await pool.execute(
      "UPDATE tournament SET name = ?, data = ? WHERE id = ?",
      [updated.name, JSON.stringify(updated), updated.id]
    );
    const affectedRows = (result as { affectedRows: number }).affectedRows;
    if (affectedRows === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ tournament: updated });
  } catch (err) {
    console.error("[TOURNAMENTS PUT]", err);
    const message = err instanceof Error ? err.message : "Erro ao atualizar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    await pool.execute("DELETE FROM tournament WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOURNAMENTS DELETE]", err);
    const message = err instanceof Error ? err.message : "Erro ao deletar campeonato";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
