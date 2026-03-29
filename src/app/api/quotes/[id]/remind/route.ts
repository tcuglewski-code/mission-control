import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/quotes/[id]/remind
// Sendet eine Erinnerungs-E-Mail (Placeholder — kein SMTP konfiguriert)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

    // Placeholder: SMTP nicht konfiguriert
    // TODO: Implementiere SMTP mit nodemailer oder Resend
    // Empfänger: quote.clientEmail
    // Betreff: `Erinnerung: Angebot ${quote.number} — ${quote.title}`
    // Inhalt: Gültig bis ${quote.validUntil}, Angebotsbetrag ${quote.amount}

    console.log(`[REMIND] Würde E-Mail an ${quote.clientEmail ?? "(keine E-Mail)"} für Angebot ${quote.number} senden`);

    return NextResponse.json({
      success: true,
      message: `Erinnerung für ${quote.number} (${quote.clientName}) vorgemerkt.`,
      placeholder: true,
      recipient: quote.clientEmail ?? null,
    });
  } catch (err) {
    console.error("[POST /api/quotes/[id]/remind]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
