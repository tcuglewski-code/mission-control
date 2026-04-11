import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";
import { createNotification, getAuthUserIdByUserId } from "@/lib/notifications";
import { logApiError } from "@/lib/error-log";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const recurringOnly = searchParams.get("recurring") === "true";
    const filterBlocked = searchParams.get("filter") === "blocked";

    // BUG FIX: Non-admins sehen NUR Tasks aus explizit freigegebenen Projekten.
    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};
    const sprintId = searchParams.get("sprintId");
    const noSprint = searchParams.get("noSprint") === "true";

    // Kalender: Monat-Filter (YYYY-MM) — filtert nach dueDate im angegebenen Monat
    const month = searchParams.get("month");
    let monthFilter = {};
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59, 999);
      monthFilter = { dueDate: { gte: start, lte: end } };
    }

    const noProject = searchParams.get("noProject") === "true";

    // ─── filter=blocked: Nur Tasks mit aktiven Blockern zurückgeben ──────────
    let blockedTaskIds: string[] | null = null;
    if (filterBlocked) {
      const blockerDeps = await prisma.taskDependency.findMany({
        where: { isBlocker: true },
        select: { taskId: true, dependsOnId: true },
      });
      const blockerTaskIds = [...new Set(blockerDeps.map((d) => d.dependsOnId))];
      const blockerStatuses = await prisma.task.findMany({
        where: { id: { in: blockerTaskIds } },
        select: { id: true, status: true },
      });
      const blockerStatusMap = new Map(blockerStatuses.map((t) => [t.id, t.status]));
      const activeDeps = blockerDeps.filter(
        (d) => blockerStatusMap.get(d.dependsOnId) !== "done"
      );
      blockedTaskIds = [...new Set(activeDeps.map((d) => d.taskId))];
    }

    const tasks = await prisma.task.findMany({
      where: {
        ...(filterBlocked && blockedTaskIds ? { id: { in: blockedTaskIds } } : {}),
        ...(status ? { status } : {}),
        ...(noProject ? { projectId: null } : projectId ? { projectId } : {}),
        ...accessFilter,
        ...(noSprint ? { sprintId: null } : sprintId === "null" ? { sprintId: null } : sprintId ? { sprintId } : {}),
        ...monthFilter,
        ...(recurringOnly ? { recurring: true } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true, color: true } },
        taskLabels: { include: { label: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    await logApiError({ path: "/api/tasks", method: "GET", statusCode: 500, message: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      status,
      priority,
      labels: rawLabels,
      dueDate,
      startDate,
      agentPrompt,
      projectId,
      assigneeId,
      sprintId,
      milestoneId,
      sourceEmailId,
      recurring,
      recurringInterval,
      recurringDay,
      recurringEndDate,
      parentTaskId,
      startAfterTaskId,
      // ICE Scoring (AF058)
      iceImpact,
      iceConfidence,
      iceEase,
    } = body;

    // ICE Score berechnen wenn alle Werte vorhanden
    let iceScore: number | null = null;
    if (iceImpact && iceConfidence && iceEase) {
      iceScore = (iceImpact * iceConfidence * iceEase) / 10;
    }

    // labels: accept string or string[] — store as comma-separated string
    const labels = Array.isArray(rawLabels) ? rawLabels.join(",") : rawLabels ?? null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status ?? "backlog",
        priority: priority ?? "medium",
        labels,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        agentPrompt: agentPrompt || null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
        milestoneId: milestoneId || null,
        sourceEmailId: sourceEmailId || null,
        recurring: recurring ?? false,
        recurringInterval: recurringInterval || null,
        recurringDay: recurringDay ?? null,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
        parentTaskId: parentTaskId || null,
        startAfterTaskId: startAfterTaskId || null,
        // ICE Scoring (AF058)
        iceImpact: iceImpact || null,
        iceConfidence: iceConfidence || null,
        iceEase: iceEase || null,
        iceScore: iceScore,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true, color: true } },
      },
    });

    await logActivity({
      userId:       user.id,
      userEmail:    user.email,
      action:       "created",
      resource:     "task",
      resourceId:   task.id,
      resourceName: task.title,
      projectId:    task.projectId ?? undefined,
      details:      { status: task.status, priority: task.priority },
    });

    triggerWebhooks("task.created", { task }, task.projectId ?? undefined);

    // Email als "Task erstellt" markieren wenn sourceEmailId vorhanden
    if (sourceEmailId) {
      await prisma.inboxEmail.update({
        where: { id: sourceEmailId },
        data: { taskCreated: true },
      }).catch(() => null); // Ignoriere Fehler falls Email nicht gefunden
    }

    // Benachrichtigung: Task zugewiesen
    if (task.assigneeId) {
      const authUserId = await getAuthUserIdByUserId(task.assigneeId);
      if (authUserId) {
        void createNotification(
          authUserId,
          "task_assigned",
          "Task zugewiesen",
          `Dir wurde der Task „${task.title}" zugewiesen.`,
          `/tasks`
        );
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    await logApiError({ path: "/api/tasks", method: "POST", statusCode: 500, message: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
