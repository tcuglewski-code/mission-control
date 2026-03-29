import { NextRequest, NextResponse } from "next/server";

/**
 * Zentrale Vercel Cron Authentifizierung
 * 
 * Vercel sendet bei Cron-Jobs automatisch:
 * - Authorization: Bearer <CRON_SECRET>
 * 
 * CRON_SECRET muss in Vercel ENV gesetzt sein.
 * In Development (NODE_ENV !== "production") kann zusätzlich
 * ohne Auth aufgerufen werden wenn ALLOW_DEV_CRON=true gesetzt ist.
 */

export function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET ist in Production Pflicht
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CRON AUTH] CRON_SECRET nicht konfiguriert in Production!");
      return false;
    }
    // In Development ohne Secret erlauben wenn explizit aktiviert
    if (process.env.ALLOW_DEV_CRON === "true") {
      console.warn("[CRON AUTH] Development-Modus: Cron ohne Secret erlaubt (ALLOW_DEV_CRON=true)");
      return true;
    }
    console.error("[CRON AUTH] CRON_SECRET nicht konfiguriert und ALLOW_DEV_CRON nicht gesetzt");
    return false;
  }

  // Bearer Token prüfen
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Alternativer x-cron-secret Header (Legacy-Kompatibilität)
  const legacyHeader = req.headers.get("x-cron-secret");
  if (legacyHeader === cronSecret) {
    console.warn("[CRON AUTH] Legacy x-cron-secret Header verwendet — bitte auf Authorization umstellen");
    return true;
  }

  return false;
}

/**
 * Middleware-Wrapper für Cron-Routen
 * Gibt automatisch 401 zurück wenn Auth fehlschlägt
 */
export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    if (!verifyCronAuth(req)) {
      console.error(`[CRON AUTH] Unauthorized: ${req.nextUrl.pathname}`);
      return NextResponse.json(
        { error: "Unauthorized — CRON_SECRET erforderlich" },
        { status: 401 }
      );
    }
    return handler(req);
  };
}
