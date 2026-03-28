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

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const favorite = await prisma.projectFavorite.upsert({
      where: { userId_projectId: { userId: user.id, projectId: id } },
      create: { userId: user.id, projectId: id },
      update: {},
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects/[id]/favorite]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await prisma.projectFavorite.deleteMany({
      where: { userId: user.id, projectId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]/favorite]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
