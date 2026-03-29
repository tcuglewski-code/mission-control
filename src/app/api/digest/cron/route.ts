import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";

// Vercel Cron Handler: täglich 06:00 Uhr UTC
// Konfiguration in vercel.json: { "crons": [{ "path": "/api/digest/cron", "schedule": "0 6 * * *" }] }

export async function GET(req: NextRequest) {
  try {
    // Cron-Secret prüfen (von Vercel automatisch gesetzt)
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: "Unauthorized — CRON_SECRET erforderlich" }, { status: 401 });
    }

    // Digest generieren durch Weiterleitung an den generate-Endpunkt
    const baseUrl = req.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/digest/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Interner API-Key aus Umgebungsvariable
        authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? process.env.MC_API_KEY ?? ""}`,
      },
      body: "{}",
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Digest-Generierung fehlgeschlagen: ${error}`);
    }

    const digest = await res.json();
    console.log("[CRON] Tagesdigest erfolgreich generiert:", digest.id);

    return NextResponse.json({
      ok: true,
      digestId: digest.id,
      datum: digest.datum,
    });
  } catch (error: any) {
    console.error("[CRON /api/digest/cron]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
