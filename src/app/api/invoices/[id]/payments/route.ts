import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id]/payments — Alle Zahlungen einer Rechnung
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(payments);
  } catch (err) {
    console.error("[GET /api/invoices/[id]/payments]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/invoices/[id]/payments — Zahlung erfassen
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { amount, date, method, note } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Gültiger Betrag erforderlich" }, { status: 400 });
    }

    // Rechnung laden
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    // Neue Zahlung anlegen
    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        method: method ?? "Überweisung",
        note: note ?? null,
      },
    });

    // Gesamtzahlungen berechnen
    const totalPaid =
      invoice.payments.reduce((s, p) => s + p.amount, 0) + Number(amount);

    // Status automatisch aktualisieren
    let newStatus = invoice.status;
    if (totalPaid >= invoice.amount) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    }

    // Invoice updaten
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paymentAmount: totalPaid,
        paymentDate: payment.date,
        paymentMethod: method ?? invoice.paymentMethod,
        status: newStatus,
        ...(newStatus === "PAID" ? { paidAt: payment.date } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        items: { orderBy: { position: "asc" } },
        payments: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json({ payment, invoice: updatedInvoice }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices/[id]/payments]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
