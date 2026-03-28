import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.projectTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const duplicate = await prisma.projectTemplate.create({
      data: {
        name: `${template.name} (Kopie)`,
        description: template.description,
        category: template.category,
        tasks: template.tasks as object,
        isSystem: false,
        createdBy: user.id,
        createdByName: user.name || user.email || "Unbekannt",
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("[POST /api/templates/[id]/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
