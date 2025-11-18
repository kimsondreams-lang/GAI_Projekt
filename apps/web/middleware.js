import { NextResponse } from "next/server";

async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Public paths: API, Next assets, favicon, and the login page itself
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get("gai_session")?.value || "";
  const rawSecret = process.env.GAI_PANEL_PASSWORD ?? process.env.NEXT_PUBLIC_GAI_PANEL_PASSWORD ?? process.env.AUTH_PASSWORD ?? "";
  const secret = String(rawSecret).trim();

  // If no secret configured, don't block access
  if (!secret) {
    return NextResponse.next();
  }

  const expected = await sha256Hex(secret);
  if (session !== expected) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
