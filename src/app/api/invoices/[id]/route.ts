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
      include: { project: { select: { id: true, name: true, color: true } } },
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
    const { number, description, amount, status, dueDate, paidAt } = body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(number !== undefined ? { number } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
      },
      include: { project: { select: { id: true, name: true, color: true } } },
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
