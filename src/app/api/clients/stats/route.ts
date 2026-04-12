import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/clients/stats
// Liefert: top3 nach Umsatz + Neukunden diesen Monat
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Neukunden diesen Monat
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const neukundenCount = await prisma.client.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Top 3 Kunden nach Umsatz (bezahlte Rechnungen)
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        invoices: {
          where: { status: { in: ["PAID", "PARTIAL"] } },
          select: { amount: true, paymentAmount: true },
        },
      },
    });

    const clientsWithUmsatz = allClients
      .map((c) => ({
        id: c.id,
        name: c.name,
        umsatz: c.invoices.reduce(
          (sum, inv) => sum + (inv.paymentAmount ?? inv.amount ?? 0),
          0
        ),
      }))
      .sort((a, b) => b.umsatz - a.umsatz)
      .slice(0, 3);

    const gesamtKunden = await prisma.client.count();

    return NextResponse.json({
      top3: clientsWithUmsatz,
      neukundenMonat: neukundenCount,
      gesamt: gesamtKunden,
    });
  } catch (err) {
    console.error("[GET /api/clients/stats]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
