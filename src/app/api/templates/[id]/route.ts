import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.projectTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    return NextResponse.json(template);
  } catch (error) {
    console.error("[GET /api/templates/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.projectTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // Nur eigene Vorlagen oder Admin darf bearbeiten; System-Vorlagen nie
    if (template.isSystem) {
      return NextResponse.json({ error: "System-Vorlagen können nicht bearbeitet werden" }, { status: 403 });
    }
    if (user.role !== "admin" && template.createdBy !== user.id) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, category, tasks } = body;

    const updated = await prisma.projectTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(tasks && { tasks }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/templates/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.projectTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    if (template.isSystem) {
      return NextResponse.json({ error: "System-Vorlagen können nicht gelöscht werden" }, { status: 403 });
    }
    if (user.role !== "admin" && template.createdBy !== user.id) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    await prisma.projectTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/templates/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
