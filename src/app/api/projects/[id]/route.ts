import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Simplified query for debugging
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true, members: true, docs: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch related data separately to isolate any issues
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
    });

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const docs = await prisma.doc.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const logs = await prisma.activityLog.findMany({
      where: { projectId: id },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      ...project,
      members,
      tasks,
      docs,
      logs,
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]]", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
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
