import { type NextRequest, NextResponse } from "next/server";

// Verified dari server/app/main.py baris 19: session_cookie="session"
const SESSION_COOKIE = "session";

const protectedPaths = ["/beranda", "/riwayat", "/akun", "/transaksi"];
const authPaths = ["/masuk", "/daftar"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const hasSession = Boolean(sessionCookie?.value);

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthPath = authPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // UX guard only — FastAPI /api/v1/auth/me tetap authoritative untuk validity
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/beranda";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/beranda/:path*",
    "/riwayat/:path*",
    "/akun/:path*",
    "/transaksi/:path*",
    "/masuk",
    "/daftar",
  ],
};
