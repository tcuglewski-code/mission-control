import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getISOWeek, startOfISOWeek, endOfISOWeek, format } from "date-fns";
import { de } from "date-fns/locale";

// GET /api/projects/[id]/report — Gibt Projektdaten für PDF-Report als JSON zurück

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

    if (user.role !== "admin" && !user.projectAccess.includes(id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            sprint: { select: { id: true, name: true } },
          },
          orderBy: [{ status: "asc" }, { priority: "desc" }],
        },
        members: {
          include: {
            user: { select: { id: true, name: true, role: true, avatar: true } },
          },
        },
        sprints: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Task-Statistiken
    const taskStats = {
      total: project.tasks.length,
      open: project.tasks.filter((t) => t.status === "todo" || t.status === "backlog").length,
      inProgress: project.tasks.filter((t) => t.status === "in_progress").length,
      inReview: project.tasks.filter((t) => t.status === "in_review").length,
      done: project.tasks.filter((t) => t.status === "done").length,
      blocked: project.tasks.filter((t) => t.status === "blocked").length,
    };

    // Burndown-Daten: Erledigte Tasks pro Sprint
    const burndownData = project.sprints.map((sprint) => {
      const sprintTasks = project.tasks.filter((t) => t.sprintId === sprint.id);
      return {
        sprintName: sprint.name,
        total: sprintTasks.length,
        done: sprintTasks.filter((t) => t.status === "done").length,
        storyPoints: sprint.storyPoints ?? null,
        completedPoints: sprint.completedPoints ?? null,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      };
    });

    // KW + Wochenbereich
    const now = new Date();
    const calendarWeek = getISOWeek(now);
    const weekStart = startOfISOWeek(now);
    const weekEnd = endOfISOWeek(now);
    const weekRange = `${format(weekStart, "d.", { locale: de })} – ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;
    const reportDate = format(now, "d. MMMM yyyy", { locale: de });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        longDescription: project.longDescription,
        status: project.status,
        progress: project.progress,
        priority: project.priority,
        color: project.color,
        stack: project.stack,
        githubRepo: project.githubRepo,
        liveUrl: project.liveUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      taskStats,
      tasks: project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee?.name ?? null,
        sprint: t.sprint?.name ?? null,
        dueDate: t.dueDate,
        storyPoints: t.storyPoints,
      })),
      members: project.members.map((m) => ({
        id: m.id,
        name: m.user.name,
        role: m.role,
        userRole: m.user.role,
      })),
      burndownData,
      calendarWeek,
      weekRange,
      reportDate,
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]/report]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
