import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/finance/summary
 * Gibt aggregierte Finanz-KPIs für das Dashboard zurück.
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
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    // KPIs
    const totalRevenue = allInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const openAmount = allInvoices
      .filter((inv) => inv.status === "OPEN")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const overdueAmount = allInvoices
      .filter((inv) => inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const openCount = allInvoices.filter((inv) => inv.status === "OPEN").length;
    const overdueCount = allInvoices.filter((inv) => inv.status === "OVERDUE").length;
    const paidCount = allInvoices.filter((inv) => inv.status === "PAID").length;

    // Monatliche Einnahmen (letzte 12 Monate)
    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    allInvoices
      .filter((inv) => inv.status === "PAID" && inv.paidAt)
      .forEach((inv) => {
        const d = new Date(inv.paidAt!);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthlyMap) monthlyMap[key] += inv.amount;
      });
    const monthlyRevenue = Object.entries(monthlyMap).map(([month, amount]) => ({
      month,
      amount,
    }));

    // Top-5 Projekte nach Umsatz (PAID)
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

    // Offene Posten (OPEN + OVERDUE)
    const openItems = allInvoices
      .filter((inv) => inv.status === "OPEN" || inv.status === "OVERDUE")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({
      kpis: {
        totalRevenue,
        openAmount,
        overdueAmount,
        openCount,
        overdueCount,
        paidCount,
      },
      monthlyRevenue,
      topProjects,
      openItems,
    });
  } catch (err) {
    console.error("[GET /api/finance/summary]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
