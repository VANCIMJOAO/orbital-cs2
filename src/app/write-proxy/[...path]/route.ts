import { NextRequest, NextResponse } from "next/server";
import { G5API_URL, WRITE_PROXY_ALLOWED_PREFIXES, WRITE_PROXY_ALLOW_ALL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function proxyRequest(req: NextRequest, path: string) {
  // Validate path against allowlist (bypass if WRITE_PROXY_ALLOW_ALL is enabled)
  const firstSegment = path.split("/")[0];
  const isAllowed = WRITE_PROXY_ALLOWED_PREFIXES.includes(firstSegment as typeof WRITE_PROXY_ALLOWED_PREFIXES[number]);

  if (!isAllowed && !WRITE_PROXY_ALLOW_ALL) {
    console.warn(`[write-proxy] BLOCKED: /${path} (prefix "${firstSegment}" not in allowlist)`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (WRITE_PROXY_ALLOW_ALL && !isAllowed) {
    console.warn(`[write-proxy] BYPASS: /${path} allowed via WRITE_PROXY_ALLOW_ALL (add "${firstSegment}" to constants.ts)`);
  }

  const queryString = new URL(req.url).search;
  const url = `${G5API_URL}/${path}${queryString}`;
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
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = path.join("/");
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
