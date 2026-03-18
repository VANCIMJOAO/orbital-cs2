import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../../init-db";
import { checkAdmin } from "../../auth";

// GET /api/brand/ai/report?id=123
export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute(
      "SELECT * FROM brand_ai_reports WHERE id = ?",
      [id]
    );
    const reports = rows as Record<string, unknown>[];
    if (reports.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ report: reports[0] });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
