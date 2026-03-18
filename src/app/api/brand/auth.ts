import { NextRequest, NextResponse } from "next/server";

const G5API_AUTH_URL =
  process.env.G5API_URL ||
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

export async function checkAdmin(req: NextRequest): Promise<NextResponse | null> {
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
