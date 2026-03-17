import { NextRequest, NextResponse } from "next/server";

const G5API_URL =
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

export async function middleware(req: NextRequest) {
  // Only protect /admin routes
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Check auth by forwarding session cookie to G5API
  const cookie = req.headers.get("cookie") || "";
  if (!cookie) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${G5API_URL}/isloggedin`, {
      headers: { Cookie: cookie },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const data = await res.json();
    if (!data || data === false) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Check admin role
    const user = data.user || data;
    if (!user.admin && !user.super_admin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch {
    clearTimeout(timeout);
    // On timeout or error, deny access
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
