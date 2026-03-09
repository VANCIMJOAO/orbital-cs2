import { NextRequest, NextResponse } from "next/server";

const G5API_URL =
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function proxyRequest(req: NextRequest, path: string) {
  const url = `${G5API_URL}/${path}`;
  const cookie = req.headers.get("cookie") || "";

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    if (res.status === 302) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[write-proxy] ERROR:`, err);
    return NextResponse.json({ error: "Proxy error", details: String(err) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = path.join("/");
  if (p === "test") {
    return NextResponse.json({ ok: true, msg: "write-proxy is working" });
  }
  if (p === "debug") {
    const cookie = req.headers.get("cookie") || "";
    const g5cookies = cookie.split(";").map(c => c.trim()).filter(c => c.startsWith("G5API="));
    return NextResponse.json({ cookieCount: g5cookies.length, cookies: g5cookies.map(c => c.substring(0, 30) + "..."), fullCookieLength: cookie.length });
  }
  return proxyRequest(req, p);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(req, path.join("/"));
}
