import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/invoices?projectId=xxx
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
    const { projectId, number, description, amount, status, dueDate } = body;

    if (!projectId) return NextResponse.json({ error: "Projekt ist erforderlich" }, { status: 400 });
    if (!number) return NextResponse.json({ error: "Rechnungsnummer ist erforderlich" }, { status: 400 });
    if (!amount || isNaN(Number(amount))) return NextResponse.json({ error: "Betrag ist erforderlich" }, { status: 400 });
    if (!dueDate) return NextResponse.json({ error: "Fälligkeitsdatum ist erforderlich" }, { status: 400 });

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        number,
        description: description || null,
        amount: Number(amount),
        status: status ?? "OPEN",
        dueDate: new Date(dueDate),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
