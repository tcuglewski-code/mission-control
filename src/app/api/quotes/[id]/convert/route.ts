import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/quotes/[id]/convert
// Wandelt ein Angebot in eine Rechnung um
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
    if (quote.status === "invoiced") {
      return NextResponse.json({ error: "Angebot wurde bereits in eine Rechnung umgewandelt" }, { status: 400 });
    }

    // Nächste Rechnungsnummer ermitteln
    const year = new Date().getFullYear();
    const prefix = `RE-${year}-`;
    const existing = await prisma.invoice.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    });
    let nextSeq = 1;
    if (existing.length > 0) {
      const nums = existing
        .map((inv) => parseInt(inv.number.replace(prefix, ""), 10))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) nextSeq = Math.max(...nums) + 1;
    }
    const invoiceNumber = `${prefix}${String(nextSeq).padStart(3, "0")}`;

    // Rechnung benötigt ein Projekt
    const projectId = quote.projectId;
    if (!projectId) {
      return NextResponse.json(
        { error: "Angebot hat kein Projekt — bitte zuerst ein Projekt zuweisen" },
        { status: 400 }
      );
    }

    // Brutto aus Items berechnen
    const items = quote.items as Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
    }>;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        number: invoiceNumber,
        description: quote.title,
        amount: quote.amount,
        status: "OPEN",
        invoiceDate: new Date(),
        dueDate,
        clientName: quote.clientName,
        notes: quote.note || null,
        items: {
          create: items.map((item, idx) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            vatRate: Number(item.vatRate),
            position: idx,
          })),
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true,
      },
    });

    // Angebot auf "invoiced" setzen
    await prisma.quote.update({
      where: { id },
      data: { status: "invoiced", invoiceId: invoice.id },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quotes/[id]/convert]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
