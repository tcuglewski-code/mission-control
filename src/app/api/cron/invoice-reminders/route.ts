import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/invoice-reminders
 *
 * Cron-Endpunkt für automatisches Mahnwesen:
 * - Prüft alle OVERDUE-Rechnungen
 * - Erstellt Mahnung wenn >14 Tage seit letzter Mahnung (oder Fälligkeit)
 * - Bis zu 3 Mahnstufen, danach nur noch Benachrichtigung
 *
 * Mahngebühren (Standard):
 * - 1. Mahnung: 0 € (Zahlungserinnerung)
 * - 2. Mahnung: 5 €
 * - 3. Mahnung: 10 €
 *
 * Aufruf via Vercel Cron: Authorization: Bearer <CRON_SECRET>
 */

const REMINDER_FEES: Record<number, number> = {
  1: 0,    // 1. Mahnung = Zahlungserinnerung (kostenlos)
  2: 5,    // 2. Mahnung
  3: 10,   // 3. Mahnung (letzte)
};

const DAYS_BETWEEN_REMINDERS = 14;

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { error: "Unauthorized — CRON_SECRET erforderlich" },
        { status: 401 }
      );
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - DAYS_BETWEEN_REMINDERS * 24 * 60 * 60 * 1000);

    // Alle OVERDUE-Rechnungen mit dunningLevel < 3 laden
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "OVERDUE",
        dunningLevel: { lt: 3 },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        remindersCreated: 0,
        message: "Keine überfälligen Rechnungen für Mahnungen",
      });
    }

    const remindersToCreate: {
      invoice: typeof overdueInvoices[0];
      newLevel: number;
      fee: number;
    }[] = [];

    for (const invoice of overdueInvoices) {
      // Bestimme Referenzdatum: letzte Mahnung oder Fälligkeitsdatum
      const referenceDate = invoice.dunningDate || invoice.dueDate;

      // Prüfe ob >14 Tage seit Referenzdatum
      if (referenceDate <= cutoffDate) {
        const newLevel = invoice.dunningLevel + 1;
        const fee = REMINDER_FEES[newLevel] || 0;

        remindersToCreate.push({
          invoice,
          newLevel,
          fee,
        });
      }
    }

    if (remindersToCreate.length === 0) {
      return NextResponse.json({
        remindersCreated: 0,
        checked: overdueInvoices.length,
        message: "Alle Rechnungen wurden bereits gemahnt, noch keine 14 Tage vergangen",
      });
    }

    // Mahnungen erstellen und Invoices updaten
    const results = [];
    for (const { invoice, newLevel, fee } of remindersToCreate) {
      // InvoiceReminder erstellen
      const reminder = await prisma.invoiceReminder.create({
        data: {
          invoiceId: invoice.id,
          level: newLevel,
          fee,
          sentVia: "system",
          note: `Automatisch erstellt via Cron (${newLevel}. Mahnung)`,
        },
      });

      // Invoice updaten
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          dunningLevel: newLevel,
          dunningDate: now,
          dunningFee: invoice.dunningFee + fee,
        },
      });

      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        projectName: invoice.project.name,
        amount: invoice.amount,
        newLevel,
        fee,
        reminderId: reminder.id,
      });
    }

    // Benachrichtigungen an Admins
    const admins = await prisma.authUser.findMany({
      where: { role: "admin", active: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      const notifications = [];
      for (const result of results) {
        const levelText =
          result.newLevel === 1
            ? "Zahlungserinnerung"
            : result.newLevel === 2
            ? "2. Mahnung"
            : "Letzte Mahnung";

        for (const admin of admins) {
          notifications.push({
            userId: admin.id,
            type: "warning",
            title: `${levelText} erstellt: ${result.invoiceNumber}`,
            message: `${levelText} für ${result.invoiceNumber} (${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(result.amount)}) — Projekt: ${result.projectName}${result.fee > 0 ? ` — Mahngebühr: ${result.fee}€` : ""}`,
            link: `/projects/${overdueInvoices.find((i) => i.id === result.invoiceId)?.projectId}/finance`,
          });
        }
      }
      await prisma.notification.createMany({ data: notifications });
    }

    // Audit-Log
    try {
      const { logActivity } = await import("@/lib/audit");
      await logActivity({
        action: "INVOICE_REMINDERS_GENERATED",
        resource: "invoice",
        userId: "system",
        details: {
          count: results.length,
          invoices: results.map((r) => r.invoiceNumber),
        },
      });
    } catch (e) {
      // Audit optional
    }

    return NextResponse.json({
      remindersCreated: results.length,
      results,
      message: `${results.length} Mahnung(en) automatisch erstellt`,
    });
  } catch (err) {
    console.error("[GET /api/cron/invoice-reminders]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
