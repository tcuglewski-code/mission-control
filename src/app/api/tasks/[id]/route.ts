import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";
import { createNotification, getAuthUserIdByUserId } from "@/lib/notifications";
import { calcNextDueDate, type RecurringIntervalType } from "@/lib/recurring";

/**
 * Prüft ob ein Task aktive Blocker hat (isBlocker=true, Blocker noch nicht erledigt).
 * Gibt die Anzahl der aktiven Blocker zurück.
 */
async function countActiveBlockers(taskId: string): Promise<number> {
  const blockerDeps = await prisma.taskDependency.findMany({
    where: { taskId, isBlocker: true },
    select: { dependsOnId: true },
  });
  if (blockerDeps.length === 0) return 0;

  const blockerTasks = await prisma.task.findMany({
    where: {
      id: { in: blockerDeps.map((d) => d.dependsOnId) },
      status: { not: "done" },
    },
    select: { id: true },
  });
  return blockerTasks.length;
}

/**
 * Wenn ein Task erledigt wird: Alle blockierten Nachfolger benachrichtigen.
 */
async function notifyBlockedTasksOnCompletion(completedTaskId: string, completedTaskTitle: string) {
  try {
    const blockerDeps = await prisma.taskDependency.findMany({
      where: { dependsOnId: completedTaskId, isBlocker: true },
      select: { taskId: true },
    });
    if (blockerDeps.length === 0) return;

    const blockedTaskIds = blockerDeps.map((d) => d.taskId);
    const blockedTasks = await prisma.task.findMany({
      where: { id: { in: blockedTaskIds } },
      select: { id: true, title: true, assigneeId: true },
    });

    for (const blockedTask of blockedTasks) {
      // Prüfe ob noch weitere aktive Blocker vorhanden
      const remainingBlockers = await prisma.taskDependency.findMany({
        where: { taskId: blockedTask.id, isBlocker: true, dependsOnId: { not: completedTaskId } },
        select: { dependsOnId: true },
      });
      const stillBlocked = await prisma.task.findMany({
        where: {
          id: { in: remainingBlockers.map((b) => b.dependsOnId) },
          status: { not: "done" },
        },
        select: { id: true },
      });

      if (stillBlocked.length === 0 && blockedTask.assigneeId) {
        const authUserId = await getAuthUserIdByUserId(blockedTask.assigneeId);
        if (authUserId) {
          void createNotification(
            authUserId,
            "blocker_resolved",
            "Blocker erledigt ✅",
            `Du kannst jetzt mit „${blockedTask.title}" weitermachen — der Blocker „${completedTaskTitle}" wurde erledigt.`,
            `/tasks`
          );
        }
      }
    }
  } catch (err) {
    console.error("[notifyBlockedTasksOnCompletion]", err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true, color: true } },
        taskLabels: { include: { label: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Non-admins can only access tasks in their allowed projects
    if (user.role !== "admin" && task.projectId && !user.projectAccess.includes(task.projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[GET /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateTask(id: string, body: Record<string, unknown>) {
  const {
    title,
    description,
    status,
    priority,
    labels,
    dueDate,
    startDate,
    agentPrompt,
    projectId,
    assigneeId,
    sprintId,
    milestoneId,
    timeSpentSeconds,
    storyPoints,
    recurring,
    recurringInterval,
    recurringDay,
    recurringEndDate,
    parentTaskId,
    startAfterTaskId,
    iceImpact,
    iceConfidence,
    iceEase,
  } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    labels?: string;
    dueDate?: string | null;
    startDate?: string | null;
    agentPrompt?: string | null;
    projectId?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    milestoneId?: string | null;
    timeSpentSeconds?: number;
    storyPoints?: number | null;
    recurring?: boolean;
    recurringInterval?: RecurringIntervalType | null;
    recurringDay?: number | null;
    recurringEndDate?: string | null;
    parentTaskId?: string | null;
    startAfterTaskId?: string | null;
    iceImpact?: number | null;
    iceConfidence?: number | null;
    iceEase?: number | null;
  };
  
  // ICE Score berechnen wenn alle Werte vorhanden
  let iceScore: number | null = null;
  const hasIceUpdate = iceImpact !== undefined || iceConfidence !== undefined || iceEase !== undefined;
  if (hasIceUpdate) {
    // Bestehende Werte aus DB holen falls nicht alle übergeben
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { iceImpact: true, iceConfidence: true, iceEase: true },
    });
    const impact = iceImpact ?? existingTask?.iceImpact;
    const confidence = iceConfidence ?? existingTask?.iceConfidence;
    const ease = iceEase ?? existingTask?.iceEase;
    if (impact && confidence && ease) {
      iceScore = (impact * confidence * ease) / 10;
    }
  }

  // ─── Blocker-Validation: Blockierte Tasks können nicht auf "done" gesetzt werden ───
  if (status === "done") {
    const activeBlockerCount = await countActiveBlockers(id);
    if (activeBlockerCount > 0) {
      const blockerDeps = await prisma.taskDependency.findMany({
        where: { taskId: id, isBlocker: true },
        select: { dependsOnId: true },
      });
      const blockerTasks = await prisma.task.findMany({
        where: {
          id: { in: blockerDeps.map((d) => d.dependsOnId) },
          status: { not: "done" },
        },
        select: { title: true },
      });
      const blockerTitles = blockerTasks.map((t) => `„${t.title}"`).join(", ");
      throw new Error(
        `BLOCKER_ACTIVE:Dieser Task ist noch blockiert durch: ${blockerTitles}. Bitte löse zuerst die Blocker.`
      );
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(labels !== undefined && { labels }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(agentPrompt !== undefined && { agentPrompt: agentPrompt || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(sprintId !== undefined && { sprintId: sprintId || null }),
      ...(milestoneId !== undefined && { milestoneId: milestoneId || null }),
      ...(timeSpentSeconds !== undefined && { timeSpentSeconds }),
      ...(storyPoints !== undefined && { storyPoints: storyPoints ?? null }),
      ...(recurring !== undefined && { recurring }),
      ...(recurringInterval !== undefined && { recurringInterval: recurringInterval ?? null }),
      ...(recurringDay !== undefined && { recurringDay: recurringDay ?? null }),
      ...(recurringEndDate !== undefined && { recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null }),
      ...(parentTaskId !== undefined && { parentTaskId: parentTaskId ?? null }),
      ...(startAfterTaskId !== undefined && { startAfterTaskId: startAfterTaskId ?? null }),
      // ICE Scoring (AF058)
      ...(iceImpact !== undefined && { iceImpact: iceImpact ?? null }),
      ...(iceConfidence !== undefined && { iceConfidence: iceConfidence ?? null }),
      ...(iceEase !== undefined && { iceEase: iceEase ?? null }),
      ...(iceScore !== null && { iceScore }),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      sprint: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true, color: true } },
      taskLabels: { include: { label: true } },
    },
  });

  // ─── Auto-create nächste Instanz wenn wiederkehrend und abgeschlossen ─────
  if (status === "done" && task.recurring && task.recurringInterval) {
    // Prüfe ob Enddatum überschritten
    const now = new Date();
    const endDateOk = !task.recurringEndDate || task.recurringEndDate > now;

    if (endDateOk) {
      // Bestimme Root-Task-ID (parentTaskId falls vorhanden, sonst eigene ID)
      const rootId = task.parentTaskId ?? task.id;

      // Berechne nächstes Fälligkeitsdatum
      const baseDue = task.dueDate ?? now;
      const nextDue = calcNextDueDate(
        baseDue,
        task.recurringInterval as RecurringIntervalType,
        task.recurringDay
      );

      // Prüfe ob bereits eine offene Instanz mit diesem Fälligkeitsdatum existiert
      const startOfDay = new Date(nextDue);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(nextDue);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.task.findFirst({
        where: {
          parentTaskId: rootId,
          status: { not: "done" },
          dueDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!existing) {
        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: "todo",
            labels: task.labels,
            agentPrompt: task.agentPrompt,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            sprintId: task.sprintId,
            milestoneId: task.milestoneId,
            dueDate: nextDue,
            recurring: task.recurring,
            recurringInterval: task.recurringInterval,
            recurringDay: task.recurringDay,
            recurringEndDate: task.recurringEndDate,
            parentTaskId: rootId,
          },
        });
      }
    }
  }

  if (status !== undefined) {
    await prisma.activityLog.create({
      data: {
        action: status === "done" ? "completed" : "updated",
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
        projectId: task.projectId,
        metadata: JSON.stringify({ field: "status", to: status }),
      },
    });
    // Erweitert: logActivity für Audit Trail
    void logActivity({
      action:       status === "done" ? "completed" : "updated",
      resource:     "task",
      resourceId:   task.id,
      resourceName: task.title,
      projectId:    task.projectId ?? undefined,
      details:      { field: "status", to: status },
    });

    // ─── Blocker-Benachrichtigungen: Wenn Task erledigt, blockierte Tasks freigeben ───
    if (status === "done") {
      void notifyBlockedTasksOnCompletion(task.id, task.title);
    }

    // Auto-recalculate project progress
    if (task.projectId) {
      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
        select: { status: true },
      });
      const totalTasks = allTasks.length;
      const doneTasks = allTasks.filter((t) => t.status === "done").length;
      const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
      await prisma.project.update({
        where: { id: task.projectId },
        data: { progress },
      });
    }
  }

  return task;
}

async function fireTaskNotifications(
  task: Awaited<ReturnType<typeof updateTask>>,
  body: Record<string, unknown>
) {
  const { status, assigneeId } = body as { status?: string; assigneeId?: string };

  // Benachrichtigung: Task-Status geändert → Assignee informieren
  if (status !== undefined && task.assigneeId) {
    const authUserId = await getAuthUserIdByUserId(task.assigneeId);
    if (authUserId) {
      const statusLabel: Record<string, string> = {
        todo: "Offen",
        backlog: "Backlog",
        in_progress: "In Bearbeitung",
        done: "Erledigt",
        blocked: "Blockiert",
        review: "Review",
      };
      void createNotification(
        authUserId,
        "task_status_changed",
        "Task-Status geändert",
        `Status von „${task.title}" wurde auf „${statusLabel[status] ?? status}" geändert.`,
        `/tasks`
      );
    }
  }

  // Benachrichtigung: Task neu zugewiesen
  if (assigneeId !== undefined && assigneeId && assigneeId !== task.assigneeId) {
    // assigneeId in body → neu zugewiesen an diese Person
    const authUserId = await getAuthUserIdByUserId(assigneeId);
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

    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    triggerWebhooks("task.updated", { task }, task.projectId ?? undefined);
    void fireTaskNotifications(task, body);
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BLOCKER_ACTIVE:")) {
      return NextResponse.json(
        { error: error.message.replace("BLOCKER_ACTIVE:", ""), blockerActive: true },
        { status: 422 }
      );
    }
    console.error("[PUT /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    triggerWebhooks("task.updated", { task }, task.projectId ?? undefined);
    void fireTaskNotifications(task, body);
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BLOCKER_ACTIVE:")) {
      return NextResponse.json(
        { error: error.message.replace("BLOCKER_ACTIVE:", ""), blockerActive: true },
        { status: 422 }
      );
    }
    console.error("[PATCH /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    if (!hasPermission(user, PERMISSIONS.TASKS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    triggerWebhooks("task.deleted", { taskId: id, title: task.title }, task.projectId ?? undefined);

    void logActivity({
      userId:       user.id,
      userEmail:    user.email,
      action:       "deleted",
      resource:     "task",
      resourceId:   id,
      resourceName: task.title,
      projectId:    task.projectId ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
