import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";
import { subMonths, startOfMonth, endOfMonth, format, subDays } from "date-fns";
import { de } from "date-fns/locale";

/**
 * GET /api/cron/finance-review
 * 
 * Vercel Cron: 1. jeden Monats um 09:00 UTC
 * 
 * Monatlicher Finance-Review für Tomek:
 * - Offene Rechnungen (Summe, Anzahl, älteste)
 * - MRR/ARR-Entwicklung (letzte 3 Monate)
 * - Kosten-Übersicht (nach Kategorie)
 * - Cashflow-Saldo
 * 
 * Output: Telegram-Nachricht
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized — CRON_SECRET erforderlich" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const twoMonthsAgo = startOfMonth(subMonths(now, 2));
    const threeMonthsAgo = startOfMonth(subMonths(now, 3));

    // ─── 1. Offene Rechnungen ────────────────────────────────────────────────
    const openInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["OPEN", "SENT", "OVERDUE", "PARTIAL"] },
      },
      orderBy: { dueDate: "asc" },
      include: { project: { select: { name: true } } },
    });

    const openInvoicesTotal = openInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const overdueInvoices = openInvoices.filter(inv => inv.status === "OVERDUE" || inv.dueDate < now);
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const oldestOverdue = overdueInvoices[0];

    // ─── 2. MRR/ARR Entwicklung (bezahlte Rechnungen) ────────────────────────
    const getMonthlyRevenue = async (monthStart: Date) => {
      const monthEnd = endOfMonth(monthStart);
      const result = await prisma.invoice.aggregate({
        where: {
          status: "PAID",
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
        _count: true,
      });
      return {
        revenue: result._sum.amount ?? 0,
        count: result._count,
      };
    };

    const thisMonthRev = await getMonthlyRevenue(thisMonth);
    const lastMonthRev = await getMonthlyRevenue(lastMonth);
    const twoMonthsAgoRev = await getMonthlyRevenue(twoMonthsAgo);
    const threeMonthsAgoRev = await getMonthlyRevenue(threeMonthsAgo);

    // MRR = Durchschnitt der letzten 3 vollen Monate
    const avgMrr = (lastMonthRev.revenue + twoMonthsAgoRev.revenue + threeMonthsAgoRev.revenue) / 3;
    const arr = avgMrr * 12;

    // MRR-Trend (Vergleich letzter Monat vs. Vormonat)
    const mrrTrend = lastMonthRev.revenue - twoMonthsAgoRev.revenue;
    const mrrTrendPercent = twoMonthsAgoRev.revenue > 0
      ? ((mrrTrend / twoMonthsAgoRev.revenue) * 100).toFixed(1)
      : "0";

    // ─── 3. Kosten-Übersicht (aktueller + letzter Monat) ─────────────────────
    const getMonthlyExpenses = async (monthStart: Date) => {
      const monthEnd = endOfMonth(monthStart);
      const expenses = await prisma.expense.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
        },
      });
      
      const byCategory: Record<string, number> = {};
      let total = 0;
      
      for (const exp of expenses) {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
        total += exp.amount;
      }
      
      return { total, byCategory, count: expenses.length };
    };

    const thisMonthExp = await getMonthlyExpenses(thisMonth);
    const lastMonthExp = await getMonthlyExpenses(lastMonth);

    // ─── 4. Cashflow-Saldo (Einnahmen - Ausgaben, letzte 30 Tage) ────────────
    const thirtyDaysAgo = subDays(now, 30);
    
    const recentPaid = await prisma.invoice.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    const recentExpenses = await prisma.expense.aggregate({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    const cashflow30d = (recentPaid._sum.amount ?? 0) - (recentExpenses._sum.amount ?? 0);

    // ─── 5. Bevorstehende Fälligkeiten (nächste 14 Tage) ─────────────────────
    const fourteenDaysLater = subDays(now, -14);
    const upcomingDue = await prisma.invoice.findMany({
      where: {
        status: { in: ["OPEN", "SENT"] },
        dueDate: { gte: now, lte: fourteenDaysLater },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    // ─── Telegram-Report generieren ──────────────────────────────────────────
    const message = generateFinanceReportMessage({
      now,
      openInvoices: { total: openInvoicesTotal, count: openInvoices.length },
      overdue: { total: overdueTotal, count: overdueInvoices.length, oldest: oldestOverdue },
      mrr: { current: avgMrr, trend: mrrTrend, trendPercent: mrrTrendPercent, arr },
      revenue: {
        thisMonth: thisMonthRev.revenue,
        lastMonth: lastMonthRev.revenue,
        twoMonthsAgo: twoMonthsAgoRev.revenue,
      },
      expenses: {
        thisMonth: thisMonthExp,
        lastMonth: lastMonthExp,
      },
      cashflow30d,
      upcomingDue,
    });

    // Telegram senden
    const telegramResult = await sendTelegramReport(message);

    // Audit-Log
    await prisma.activityLog.create({
      data: {
        action: "FINANCE_REVIEW_GENERATED",
        entityType: "report",
        entityId: "finance-review",
        entityName: `Finance-Review ${format(now, "MMMM yyyy", { locale: de })}`,
        details: {
          openInvoicesTotal,
          openInvoicesCount: openInvoices.length,
          overdueTotal,
          overdueCount: overdueInvoices.length,
          avgMrr,
          arr,
          expensesThisMonth: thisMonthExp.total,
          cashflow30d,
          telegramSent: telegramResult.success,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      report: {
        openInvoices: { total: openInvoicesTotal, count: openInvoices.length },
        overdue: { total: overdueTotal, count: overdueInvoices.length },
        mrr: avgMrr,
        arr,
        expensesThisMonth: thisMonthExp.total,
        cashflow30d,
      },
      telegram: telegramResult,
    });
  } catch (error) {
    console.error("[CRON /api/cron/finance-review]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST alias für manuelle Ausführung
export async function POST(req: NextRequest) {
  return GET(req);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FinanceReportData {
  now: Date;
  openInvoices: { total: number; count: number };
  overdue: { total: number; count: number; oldest?: { number: string; dueDate: Date; amount: number } | null };
  mrr: { current: number; trend: number; trendPercent: string; arr: number };
  revenue: { thisMonth: number; lastMonth: number; twoMonthsAgo: number };
  expenses: {
    thisMonth: { total: number; byCategory: Record<string, number>; count: number };
    lastMonth: { total: number; byCategory: Record<string, number>; count: number };
  };
  cashflow30d: number;
  upcomingDue: Array<{ number: string; dueDate: Date; amount: number }>;
}

// ─── Report Message Generator ─────────────────────────────────────────────────
function generateFinanceReportMessage(data: FinanceReportData): string {
  const monthName = format(data.now, "MMMM yyyy", { locale: de });
  
  let msg = `💰 *Monatlicher Finance-Review*\n`;
  msg += `📅 ${monthName}\n`;
  msg += `─────────────────────\n\n`;

  // Offene Rechnungen
  const overdueEmoji = data.overdue.count > 0 ? "🔴" : "🟢";
  msg += `📋 *Offene Rechnungen*\n`;
  msg += `├ Gesamt: ${data.openInvoices.count} Rechnungen\n`;
  msg += `├ Summe: €${formatCurrency(data.openInvoices.total)}\n`;
  msg += `├ ${overdueEmoji} Überfällig: ${data.overdue.count} (€${formatCurrency(data.overdue.total)})\n`;
  if (data.overdue.oldest) {
    const daysSinceOverdue = Math.floor((data.now.getTime() - data.overdue.oldest.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    msg += `└ Älteste: ${data.overdue.oldest.number} (${daysSinceOverdue} Tage überfällig)\n`;
  } else {
    msg += `└ Keine überfälligen Rechnungen ✅\n`;
  }
  msg += `\n`;

  // MRR/ARR
  const trendEmoji = data.mrr.trend >= 0 ? "📈" : "📉";
  const trendSign = data.mrr.trend >= 0 ? "+" : "";
  msg += `💳 *MRR / ARR*\n`;
  msg += `├ MRR: €${formatCurrency(data.mrr.current)}\n`;
  msg += `├ ARR: €${formatCurrency(data.mrr.arr)}\n`;
  msg += `└ ${trendEmoji} Trend: ${trendSign}€${formatCurrency(data.mrr.trend)} (${trendSign}${data.mrr.trendPercent}%)\n`;
  msg += `\n`;

  // Umsatz-Entwicklung
  msg += `📊 *Umsatz (3 Monate)*\n`;
  msg += `├ Aktueller Monat: €${formatCurrency(data.revenue.thisMonth)}\n`;
  msg += `├ Letzter Monat: €${formatCurrency(data.revenue.lastMonth)}\n`;
  msg += `└ Vor 2 Monaten: €${formatCurrency(data.revenue.twoMonthsAgo)}\n`;
  msg += `\n`;

  // Ausgaben
  msg += `📤 *Ausgaben*\n`;
  msg += `├ Aktueller Monat: €${formatCurrency(data.expenses.thisMonth.total)} (${data.expenses.thisMonth.count} Posten)\n`;
  msg += `└ Letzter Monat: €${formatCurrency(data.expenses.lastMonth.total)}\n`;
  
  // Top-Kategorien des aktuellen Monats
  const topCategories = Object.entries(data.expenses.thisMonth.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (topCategories.length > 0) {
    msg += `   📁 Top: ${topCategories.map(([cat, amt]) => `${cat} €${formatCurrency(amt)}`).join(", ")}\n`;
  }
  msg += `\n`;

  // Cashflow
  const cashflowEmoji = data.cashflow30d >= 0 ? "🟢" : "🔴";
  const cashflowSign = data.cashflow30d >= 0 ? "+" : "";
  msg += `💵 *Cashflow (30 Tage)*\n`;
  msg += `└ ${cashflowEmoji} ${cashflowSign}€${formatCurrency(data.cashflow30d)}\n`;
  msg += `\n`;

  // Bevorstehende Fälligkeiten
  if (data.upcomingDue.length > 0) {
    msg += `⏰ *Fällig in 14 Tagen*\n`;
    for (const inv of data.upcomingDue) {
      const dueDate = format(inv.dueDate, "dd.MM.", { locale: de });
      msg += `├ ${inv.number}: €${formatCurrency(inv.amount)} (${dueDate})\n`;
    }
    msg += `\n`;
  }

  msg += `─────────────────────\n`;
  msg += `🤖 Automatisch generiert von Amadeus\n`;
  msg += `📅 ${format(data.now, "dd.MM.yyyy HH:mm", { locale: de })}`;

  return msg;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Telegram Sender ──────────────────────────────────────────────────────────
async function sendTelegramReport(message: string): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[FINANCE REVIEW] Telegram nicht konfiguriert");
    return { success: false, error: "Telegram nicht konfiguriert" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Telegram API Error: ${errBody}`);
    }

    console.log("[FINANCE REVIEW] Telegram-Report gesendet");
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("[FINANCE REVIEW] Telegram-Fehler:", errMsg);
    return { success: false, error: errMsg };
  }
}
