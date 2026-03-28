import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Non-admins can only access projects they have access to
    if (user.role !== "admin" && !user.projectAccess.includes(id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch counts
    const [taskCount, memberCount, docCount] = await Promise.all([
      prisma.task.count({ where: { projectId: id } }),
      prisma.projectMember.count({ where: { projectId: id } }),
      prisma.document.count({ where: { projectId: id } }),
    ]);

    // Fetch related data
    const [members, tasks, docs, logs] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId: id },
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      prisma.task.findMany({
        where: { projectId: id },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.document.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { projectId: id },
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      ...project,
      _count: { tasks: taskCount, members: memberCount, docs: docCount },
      members,
      tasks,
      docs,
      logs,
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, longDescription, status, progress, priority, color,
            githubRepo, liveUrl, vercelUrl, expoProjectId, stack, archived } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(longDescription !== undefined && { longDescription }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(priority !== undefined && { priority }),
        ...(color !== undefined && { color }),
        ...(githubRepo !== undefined && { githubRepo }),
        ...(liveUrl !== undefined && { liveUrl }),
        ...(vercelUrl !== undefined && { vercelUrl }),
        ...(expoProjectId !== undefined && { expoProjectId }),
        ...(stack !== undefined && { stack }),
        ...(archived === true && { archived: true, archivedAt: new Date() }),
        ...(archived === false && { archived: false, archivedAt: null }),
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

    // Audit Trail: speziell Archivierung loggen
    const actionLabel = archived === true ? "archived" : "updated";
    void logActivity({
      userId:       user.id,
      userEmail:    user.email,
      action:       actionLabel,
      resource:     "project",
      resourceId:   project.id,
      resourceName: project.name,
      projectId:    project.id,
      details:      archived !== undefined ? { archived } : undefined,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PUT /api/projects/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    void logActivity({
      userId:       user.id,
      userEmail:    user.email,
      action:       "deleted",
      resource:     "project",
      resourceId:   id,
      resourceName: project.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
