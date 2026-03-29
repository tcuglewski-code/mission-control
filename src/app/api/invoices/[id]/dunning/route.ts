import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// Mahngebühren je Stufe
const DUNNING_FEES: Record<number, number> = {
  1: 5,
  2: 10,
  3: 25,
};

// POST /api/invoices/[id]/dunning — Mahnwesen: nächste Mahnstufe setzen
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
        payments: true,
      },
    });
    if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    if (!["OPEN", "OVERDUE", "PARTIAL"].includes(invoice.status)) {
      return NextResponse.json(
        { error: "Mahnung nur für offene oder überfällige Rechnungen möglich" },
        { status: 400 }
      );
    }

    const currentLevel = invoice.dunningLevel ?? 0;
    if (currentLevel >= 3) {
      return NextResponse.json(
        { error: "Maximale Mahnstufe (3) bereits erreicht" },
        { status: 400 }
      );
    }

    const newLevel = currentLevel + 1;
    const fee = DUNNING_FEES[newLevel] ?? 0;
    const totalFee = (invoice.dunningFee ?? 0) + fee;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        dunningLevel: newLevel,
        dunningDate: new Date(),
        dunningFee: totalFee,
        status: "OVERDUE",
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
        payments: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json({
      invoice: updated,
      dunningLevel: newLevel,
      dunningFee: fee,
      totalDunningFee: totalFee,
      message: `Mahnstufe ${newLevel} gesetzt. Mahngebühr: ${fee}€ (gesamt: ${totalFee}€)`,
    });
  } catch (err) {
    console.error("[POST /api/invoices/[id]/dunning]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
