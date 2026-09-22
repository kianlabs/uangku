import { type NextRequest, NextResponse } from "next/server";

// Verified dari server/app/main.py baris 19: session_cookie="session"
const SESSION_COOKIE = "session";

const protectedPaths = ["/beranda", "/riwayat", "/anggaran", "/pengaturan", "/transaksi"];
const authPaths = ["/masuk", "/daftar"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Teruskan host yang dilihat browser ke backend via X-Forwarded-Host.
  // Backend membandingkannya dengan Origin di CSRF check — penting untuk
  // akses via IP/hostname lain (mis. Tailscale) di mana Host yang sampai
  // ke backend selalu localhost:8000 karena rewrite proxy.
  if (pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    const host = request.headers.get("host");
    if (host) headers.set("x-forwarded-host", host);
    // Teruskan IP asli dari proxy luar (mis. Fly edge) agar rate-limit
    // backend dihitung per user, bukan per proxy. Tanpa ini semua user
    // berbagi satu bucket 127.0.0.1.
    const xff = request.headers.get("x-forwarded-for");
    const flyIp = request.headers.get("fly-client-ip");
    const clientIp = xff?.split(",")[0].trim() || flyIp;
    if (clientIp) headers.set("x-forwarded-for", clientIp);
    return NextResponse.next({ request: { headers } });
  }

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
    "/api/:path*",
    "/beranda/:path*",
    "/riwayat/:path*",
    "/anggaran/:path*",
    "/pengaturan/:path*",
    "/transaksi/:path*",
    "/masuk",
    "/daftar",
  ],
};
