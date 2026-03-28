import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invoices/overdue-check
 *
 * Cron-Endpunkt: Setzt alle fälligen OPEN-Rechnungen auf OVERDUE und
 * sendet Benachrichtigungen an alle Admins.
 *
 * Kann mit einem Cron-Job (z.B. Vercel Cron täglich) aufgerufen werden.
 * Sicherung: CRON_SECRET Header oder interner Aufruf.
 */
export async function GET(req: NextRequest) {
  try {
    // Optionale Absicherung via Secret
    const cronSecret = req.headers.get("x-cron-secret");
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Alle OPEN-Rechnungen die heute oder früher fällig sind → OVERDUE
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "OPEN",
        dueDate: { lte: new Date() },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json({ updated: 0, message: "Keine überfälligen Rechnungen" });
    }

    // Status-Update
    const overdueIds = overdueInvoices.map((inv) => inv.id);
    await prisma.invoice.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: "OVERDUE" },
    });

    // Benachrichtigungen an alle Admins
    const admins = await prisma.authUser.findMany({
      where: { role: "admin", active: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      for (const invoice of overdueInvoices) {
        const notifications = admins.map((admin) => ({
          userId: admin.id,
          type: "deadline",
          title: `Rechnung überfällig: ${invoice.number}`,
          message: `Rechnung ${invoice.number} für Projekt „${invoice.project.name}" ist überfällig (${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(invoice.amount)}).`,
          link: `/projects/${invoice.projectId}/finance`,
        }));

        await prisma.notification.createMany({ data: notifications });
      }
    }

    return NextResponse.json({
      updated: overdueInvoices.length,
      invoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        project: inv.project.name,
        amount: inv.amount,
      })),
    });
  } catch (err) {
    console.error("[GET /api/invoices/overdue-check]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
