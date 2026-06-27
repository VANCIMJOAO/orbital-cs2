import { NextRequest, NextResponse } from "next/server";
import { G5API_URL, ADMIN_CHECK_TIMEOUT } from "./lib/constants";

// Modo manutenção: cobre o site público com /manutencao.html (admin e API liberados).
// Pra desligar: MAINTENANCE = false e dar deploy.
const MAINTENANCE = true;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (MAINTENANCE) {
    const liberado =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/write-proxy") ||
      pathname.startsWith("/_next") ||
      pathname === "/manutencao.html" ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/app-icon") ||
      /\.(png|jpe?g|svg|webp|ico|gif|txt|xml|json|webmanifest|woff2?)$/i.test(pathname);

    if (!liberado) {
      const url = req.nextUrl.clone();
      url.pathname = "/manutencao.html";
      return NextResponse.rewrite(url, { status: 503 });
    }
  }

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) {
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
  // Roda em tudo (pro modo manutenção), menos assets internos do Next.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
