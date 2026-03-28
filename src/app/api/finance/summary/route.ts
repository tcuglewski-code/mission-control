import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/finance/summary
 * Gibt aggregierte Finanz-KPIs für das Dashboard zurück.
 * Erweitert: Zahlungs-Tracking, Donut-Daten, Cashflow-Prognose
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const accessFilter =
      user.role !== "admin" ? { projectId: { in: user.projectAccess } } : {};

    const allInvoices = await prisma.invoice.findMany({
      where: { ...accessFilter },
      include: {
        project: { select: { id: true, name: true, color: true } },
        payments: { orderBy: { date: "desc" } },
      },
    });

    // ─── KPIs ──────────────────────────────────────────────────────────────────
    const totalRevenue = allInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const openAmount = allInvoices
      .filter((inv) => ["OPEN", "SENT"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amount, 0);

    const overdueAmount = allInvoices
      .filter((inv) => inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.amount - (inv.paymentAmount ?? 0), 0);

    const partialAmount = allInvoices
      .filter((inv) => inv.status === "PARTIAL")
      .reduce((sum, inv) => sum + inv.amount - (inv.paymentAmount ?? 0), 0);

    const openCount = allInvoices.filter((inv) => ["OPEN", "SENT"].includes(inv.status)).length;
    const overdueCount = allInvoices.filter((inv) => inv.status === "OVERDUE").length;
    const paidCount = allInvoices.filter((inv) => inv.status === "PAID").length;
    const partialCount = allInvoices.filter((inv) => inv.status === "PARTIAL").length;

    // Mahnwesen-KPIs
    const dunningLevel1 = allInvoices.filter((inv) => inv.dunningLevel === 1).length;
    const dunningLevel2 = allInvoices.filter((inv) => inv.dunningLevel === 2).length;
    const dunningLevel3 = allInvoices.filter((inv) => inv.dunningLevel === 3).length;
    const totalDunningFees = allInvoices.reduce((s, inv) => s + (inv.dunningFee ?? 0), 0);

    // Eingegangene Zahlungen (letzte 30 Tage)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPayments = await prisma.payment.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: {
        invoice: {
          select: { number: true, project: { select: { name: true, color: true } } },
        },
      },
      orderBy: { date: "desc" },
    });
    const recentPaymentsTotal = recentPayments.reduce((s, p) => s + p.amount, 0);

    // ─── Monatliche Einnahmen (letzte 12 Monate) ───────────────────────────────
    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    // Zahlungen aus Payment-Tabelle einberechnen
    const allPayments = await prisma.payment.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
    });
    allPayments.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyMap) monthlyMap[key] += p.amount;
    });
    // Auch Legacy paidAt-Rechnungen berücksichtigen
    allInvoices
      .filter((inv) => inv.status === "PAID" && inv.paidAt && inv.payments.length === 0)
      .forEach((inv) => {
        const d = new Date(inv.paidAt!);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthlyMap) monthlyMap[key] += inv.amount;
      });

    const monthlyRevenue = Object.entries(monthlyMap).map(([month, amount]) => ({
      month,
      amount,
    }));

    // ─── Donut-Daten: Offen vs. Bezahlt ───────────────────────────────────────
    const donutData = {
      paid: allInvoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + inv.amount, 0),
      open: allInvoices.filter((inv) => ["OPEN", "SENT"].includes(inv.status)).reduce((s, inv) => s + inv.amount, 0),
      overdue: allInvoices.filter((inv) => inv.status === "OVERDUE").reduce((s, inv) => s + inv.amount, 0),
      partial: allInvoices.filter((inv) => inv.status === "PARTIAL").reduce((s, inv) => s + (inv.amount - (inv.paymentAmount ?? 0)), 0),
    };

    // ─── Cashflow-Prognose: nächste 30 Tage ───────────────────────────────────
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const cashflowInvoices = allInvoices
      .filter((inv) =>
        ["OPEN", "SENT", "PARTIAL", "OVERDUE"].includes(inv.status) &&
        new Date(inv.dueDate) <= in30Days
      )
      .map((inv) => {
        const remaining = inv.amount - (inv.paymentAmount ?? 0);
        return {
          id: inv.id,
          number: inv.number,
          clientName: inv.clientName,
          amount: remaining > 0 ? remaining : inv.amount,
          dueDate: inv.dueDate,
          status: inv.status,
          dunningLevel: inv.dunningLevel,
          project: inv.project,
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const cashflowTotal = cashflowInvoices.reduce((s, inv) => s + inv.amount, 0);

    // ─── Top-5 Projekte nach Umsatz (PAID) ────────────────────────────────────
    const projectMap: Record<string, { id: string; name: string; color: string; amount: number }> = {};
    allInvoices
      .filter((inv) => inv.status === "PAID")
      .forEach((inv) => {
        if (!projectMap[inv.projectId]) {
          projectMap[inv.projectId] = {
            id: inv.projectId,
            name: inv.project.name,
            color: inv.project.color,
            amount: 0,
          };
        }
        projectMap[inv.projectId].amount += inv.amount;
      });
    const topProjects = Object.values(projectMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ─── Offene Posten (OPEN + OVERDUE + PARTIAL) ──────────────────────────────
    const openItems = allInvoices
      .filter((inv) => ["OPEN", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({
      kpis: {
        totalRevenue,
        openAmount,
        overdueAmount,
        partialAmount,
        openCount,
        overdueCount,
        paidCount,
        partialCount,
        dunningLevel1,
        dunningLevel2,
        dunningLevel3,
        totalDunningFees,
        recentPaymentsTotal,
      },
      monthlyRevenue,
      donutData,
      cashflow: {
        invoices: cashflowInvoices,
        total: cashflowTotal,
      },
      recentPayments: recentPayments.slice(0, 20),
      topProjects,
      openItems,
    });
  } catch (err) {
    console.error("[GET /api/finance/summary]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
