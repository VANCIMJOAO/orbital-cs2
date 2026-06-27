import { NextRequest, NextResponse } from "next/server";
import { G5API_URL, G5API_COOKIE_NAME, ADMIN_CHECK_TIMEOUT } from "@/lib/constants";

// Valida sessão admin contra o G5API (/isloggedin) com timeout. Auth compartilhado
// pelas rotas de escrita (inscricao, team-logo, upload, highlights/trigger, tournaments).
export async function checkAdmin(req: NextRequest): Promise<NextResponse | null> {
  const cookie = req.cookies.get(G5API_COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ADMIN_CHECK_TIMEOUT);

    const authRes = await fetch(`${G5API_URL}/isloggedin`, {
      headers: { Cookie: `${G5API_COOKIE_NAME}=${cookie}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
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
