import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        docs: { orderBy: { updatedAt: "desc" } },
        logs: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[GET /api/projects/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, status, progress, priority, color } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(priority !== undefined && { priority }),
        ...(color !== undefined && { color }),
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "updated",
        entityType: "project",
        entityId: project.id,
        entityName: project.name,
        projectId: project.id,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PUT /api/projects/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
