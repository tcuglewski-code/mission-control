import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { rateLimit } from "./src/lib/rate-limit";

// NextAuth-Instanz für den Auth-Check (ohne Providers — nur JWT/Session-Validierung)
const { auth } = NextAuth(authConfig);

/**
 * Haupt-Middleware
 *
 * Reihenfolge der Checks:
 * 1. Rate-Limiting (vor allem anderen)
 * 2. Auth-Check via NextAuth
 */
async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── EARLY BYPASS for login-flow API endpoints ─────────────────────────────
  if (pathname.startsWith("/api/login/")) {
    return NextResponse.next()
  }

  // ── IP-Adresse ermitteln ─────────────────────────────────────────────────
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown")
    .split(",")[0]
    .trim()

  // ── 1. Rate-Limiting ─────────────────────────────────────────────────────

  // Login-Pfade: max 10 Versuche pro 15 Minuten pro IP (Brute-Force-Schutz)
  if (
    pathname.startsWith("/api/auth/signin") ||
    pathname.startsWith("/api/auth/callback")
  ) {
    if (!rateLimit("login:" + ip, 10, 15 * 60 * 1000)) {
      console.warn(`[Rate-Limit] Login gesperrt für IP: ${ip}`)
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "900" }, // 15 Minuten
      })
    }
    // NextAuth verarbeitet diese Routen intern — direkt weiterleiten
    return NextResponse.next()
  }

  // Alle API-Pfade: max 100 Anfragen pro Minute pro IP
  if (pathname.startsWith("/api/")) {
    if (!rateLimit("api:" + ip, 100, 60 * 1000)) {
      console.warn(`[Rate-Limit] API gesperrt für IP: ${ip}`)
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      })
    }

    // API-Key Rate-Limiting: max 200 Anfragen pro Minute pro Key
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer mc_live_")) {
      const apiKey = authHeader.slice(7) // "Bearer " entfernen
      if (!rateLimit("apikey:" + apiKey, 200, 60 * 1000)) {
        console.warn(`[Rate-Limit] API-Key gesperrt: ${apiKey.substring(0, 16)}...`)
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60" },
        })
      }
    }
  }

  // Explicit bypass for login-flow endpoints (before auth check)
  if (pathname.startsWith("/api/login/")) {
    return NextResponse.next()
  }

  // ── 2. Auth-Check via NextAuth ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (auth as any)(req)
}

export default middleware

export const config = {
  // Alle Pfade außer statische Dateien und Next.js-Interna
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
