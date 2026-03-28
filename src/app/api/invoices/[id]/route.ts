import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[GET /api/invoices/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/invoices/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const {
      number, description, amount, status, dueDate, paidAt, invoiceDate,
      clientName, clientAddress, paymentTerms, bankDetails, notes,
      paymentMethod, paymentAmount, paymentDate, items,
    } = body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    // Wenn items mitgegeben werden: Brutto neu berechnen & Items ersetzen
    let newAmount = amount !== undefined ? Number(amount) : undefined;
    if (items && Array.isArray(items)) {
      newAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number; vatRate: number }) => {
        const netto = item.quantity * item.unitPrice;
        const mwst = netto * (item.vatRate / 100);
        return sum + netto + mwst;
      }, 0);

      // Items ersetzen
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      if (items.length > 0) {
        await prisma.invoiceItem.createMany({
          data: items.map((item: { description: string; quantity: number; unitPrice: number; vatRate: number }, idx: number) => ({
            invoiceId: id,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            vatRate: Number(item.vatRate),
            position: idx,
          })),
        });
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(number !== undefined ? { number } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(newAmount !== undefined ? { amount: newAmount } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        ...(invoiceDate !== undefined ? { invoiceDate: new Date(invoiceDate) } : {}),
        ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
        ...(clientName !== undefined ? { clientName } : {}),
        ...(clientAddress !== undefined ? { clientAddress } : {}),
        ...(paymentTerms !== undefined ? { paymentTerms } : {}),
        ...(bankDetails !== undefined ? { bankDetails } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(paymentAmount !== undefined ? { paymentAmount: Number(paymentAmount) } : {}),
        ...(paymentDate !== undefined ? { paymentDate: paymentDate ? new Date(paymentDate) : null } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("[PATCH /api/invoices/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/invoices/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
