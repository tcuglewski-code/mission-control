import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/overdue-check
 * Täglich prüfen welche Rechnungen überfällig sind.
 * Aufruf via Vercel Cron oder externem Cron-Dienst.
 * Authorization: Bearer <CRON_SECRET> oder x-cron-secret Header
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
