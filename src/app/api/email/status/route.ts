import { NextRequest, NextResponse } from "next/server";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { getEmailStatus, isSmtpConfigured } from "@/lib/email";

/**
 * GET /api/email/status
 * 
 * Gibt den aktuellen SMTP-Konfigurationsstatus zurück.
 * Nur für eingeloggte Benutzer zugänglich.
 * 
 * Response:
 * {
 *   configured: boolean,    // true wenn alle SMTP-Variablen gesetzt sind
 *   host: string,           // SMTP-Host (oder "(nicht gesetzt)")
 *   port: number,           // SMTP-Port (Standard: 587)
 *   from: string,           // Absender-Adresse
 *   mode: "smtp" | "preview" // Aktueller Modus
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = getEmailStatus();
    
    return NextResponse.json({
      ...status,
      mode: isSmtpConfigured() ? "smtp" : "preview",
      message: isSmtpConfigured()
        ? "SMTP ist konfiguriert. E-Mails werden versendet."
        : "SMTP ist nicht vollständig konfiguriert. E-Mails werden als Vorschau generiert (graceful degradation).",
    });
  } catch (error) {
    console.error("[GET /api/email/status]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
