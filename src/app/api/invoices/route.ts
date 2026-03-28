import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/invoices?projectId=xxx&status=OPEN
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const accessFilter =
      user.role !== "admin" ? { projectId: { in: user.projectAccess } } : {};

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...accessFilter,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(invoices);
  } catch (err) {
    console.error("[GET /api/invoices]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      projectId,
      number,
      description,
      amount,
      status,
      dueDate,
      invoiceDate,
      clientName,
      clientAddress,
      paymentTerms,
      bankDetails,
      notes,
      items,
    } = body;

    if (!projectId) return NextResponse.json({ error: "Projekt ist erforderlich" }, { status: 400 });
    if (!number) return NextResponse.json({ error: "Rechnungsnummer ist erforderlich" }, { status: 400 });
    if (!dueDate) return NextResponse.json({ error: "Fälligkeitsdatum ist erforderlich" }, { status: 400 });

    // Brutto-Betrag aus Positionen berechnen oder direkt übernehmen
    let bruttoAmount = amount ? Number(amount) : 0;
    if (items && Array.isArray(items) && items.length > 0) {
      bruttoAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number; vatRate: number }) => {
        const netto = item.quantity * item.unitPrice;
        const mwst = netto * (item.vatRate / 100);
        return sum + netto + mwst;
      }, 0);
    }

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        number,
        description: description || null,
        amount: bruttoAmount,
        status: status ?? "OPEN",
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: new Date(dueDate),
        clientName: clientName || null,
        clientAddress: clientAddress || null,
        paymentTerms: paymentTerms || "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
        bankDetails: bankDetails || "Koch Aufforstung GmbH · IBAN: DE00 0000 0000 0000 0000 00 · BIC: XXXXXXXX",
        notes: notes || null,
        items: items && Array.isArray(items) && items.length > 0
          ? {
              create: items.map((item: { description: string; quantity: number; unitPrice: number; vatRate: number }, idx: number) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
                position: idx,
              })),
            }
          : undefined,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
