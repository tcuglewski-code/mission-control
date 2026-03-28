import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/invoice-templates/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const template = await prisma.invoiceTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

    return NextResponse.json({ ...template, positions: JSON.parse(template.positions) });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/invoice-templates/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { name, description, positions } = body;

    const template = await prisma.invoiceTemplate.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(positions ? { positions: JSON.stringify(positions) } : {}),
      },
    });

    return NextResponse.json({ ...template, positions: JSON.parse(template.positions) });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/invoice-templates/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.invoiceTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
