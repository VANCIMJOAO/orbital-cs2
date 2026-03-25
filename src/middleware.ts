import { NextRequest, NextResponse } from "next/server";
import { G5API_URL, ADMIN_CHECK_TIMEOUT } from "./lib/constants";

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
  const timeout = setTimeout(() => controller.abort(), ADMIN_CHECK_TIMEOUT);
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
