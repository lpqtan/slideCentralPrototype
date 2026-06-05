import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "sc_auth";
const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/api/health", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth cookie presence (full verification happens in API routes)
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasAuth = cookieHeader.includes(`${COOKIE_NAME}=`);

  if (!hasAuth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
