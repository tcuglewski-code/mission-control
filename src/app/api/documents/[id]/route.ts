import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const doc = await prisma.fileDoc.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!doc) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error("[GET /api/documents/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, url, fileType, size, projectId } = body;

    const doc = await prisma.fileDoc.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(url         !== undefined && { url }),
        ...(fileType    !== undefined && { fileType }),
        ...(size        !== undefined && { size }),
        ...(projectId   !== undefined && { projectId }),
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("[PATCH /api/documents/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.fileDoc.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/documents/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
