import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/quotes/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

    return NextResponse.json(quote);
  } catch (err) {
    console.error("[GET /api/quotes/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/quotes/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { clientName, clientEmail, title, items, validUntil, status, note, projectId, pdfUrl, invoiceId } = body;

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

    let newAmount: number | undefined;
    if (items && Array.isArray(items)) {
      newAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number; vatRate: number }) => {
        const netto = item.quantity * item.unitPrice;
        return sum + netto + netto * (item.vatRate / 100);
      }, 0);
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(clientName !== undefined ? { clientName } : {}),
        ...(clientEmail !== undefined ? { clientEmail } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(items !== undefined ? { items, amount: newAmount ?? existing.amount } : {}),
        ...(validUntil !== undefined ? { validUntil: new Date(validUntil) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(pdfUrl !== undefined ? { pdfUrl } : {}),
        ...(invoiceId !== undefined ? { invoiceId } : {}),
      },
    });

    return NextResponse.json(quote);
  } catch (err) {
    console.error("[PATCH /api/quotes/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/quotes/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/quotes/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
