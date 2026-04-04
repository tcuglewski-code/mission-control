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

export interface CronAuthResult {
  authorized: boolean;
  error?: string;
  reason?: string;
}

export function verifyCronAuth(req: Request | NextRequest): CronAuthResult {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET ist in Production Pflicht
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CRON AUTH] CRON_SECRET nicht konfiguriert in Production!");
      return { authorized: false, error: "CRON_SECRET nicht konfiguriert", reason: "CRON_SECRET nicht konfiguriert" };
    }
    // In Development ohne Secret erlauben wenn explizit aktiviert
    if (process.env.ALLOW_DEV_CRON === "true") {
      console.warn("[CRON AUTH] Development-Modus: Cron ohne Secret erlaubt (ALLOW_DEV_CRON=true)");
      return { authorized: true };
    }
    console.error("[CRON AUTH] CRON_SECRET nicht konfiguriert und ALLOW_DEV_CRON nicht gesetzt");
    return { authorized: false, error: "CRON_SECRET nicht konfiguriert", reason: "CRON_SECRET nicht konfiguriert" };
  }

  // Bearer Token prüfen
  if (authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // Alternativer x-cron-secret Header (Legacy-Kompatibilität)
  const legacyHeader = req.headers.get("x-cron-secret");
  if (legacyHeader === cronSecret) {
    console.warn("[CRON AUTH] Legacy x-cron-secret Header verwendet — bitte auf Authorization umstellen");
    return { authorized: true };
  }

  return { authorized: false, error: "Unauthorized — CRON_SECRET erforderlich", reason: "Unauthorized — CRON_SECRET erforderlich" };
}

/**
 * Middleware-Wrapper für Cron-Routen
 * Gibt automatisch 401 zurück wenn Auth fehlschlägt
 */
export function withCronAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const authResult = verifyCronAuth(req);
    if (!authResult.authorized) {
      console.error(`[CRON AUTH] Unauthorized: ${req.nextUrl.pathname}`);
      return NextResponse.json(
        { error: authResult.error ?? "Unauthorized — CRON_SECRET erforderlich" },
        { status: 401 }
      );
    }
    return handler(req);
  };
}
