import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/overdue-check
 * Täglich prüfen welche Rechnungen überfällig sind.
 * Aufruf via Vercel Cron oder externem Cron-Dienst.
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized — CRON_SECRET erforderlich" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Alle OPEN / SENT / PARTIAL Rechnungen mit überschrittenem Fälligkeitsdatum
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["OPEN", "SENT", "PARTIAL"] },
        dueDate: { lt: now },
      },
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json({ updated: 0, message: "Keine überfälligen Rechnungen" });
    }

    const ids = overdueInvoices.map((inv) => inv.id);
    const result = await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: { status: "OVERDUE" },
    });

    return NextResponse.json({
      updated: result.count,
      invoiceIds: ids,
      message: `${result.count} Rechnung(en) auf OVERDUE gesetzt`,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/cron/overdue-check]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
