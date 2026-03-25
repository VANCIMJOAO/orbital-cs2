import { NextRequest, NextResponse } from "next/server";
import { G5API_URL, G5API_COOKIE_NAME } from "@/lib/constants";

export async function checkAdmin(req: NextRequest): Promise<NextResponse | null> {
  const cookie = req.cookies.get(G5API_COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const authRes = await fetch(`${G5API_URL}/isloggedin`, {
      headers: { Cookie: `${G5API_COOKIE_NAME}=${cookie}` },
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
