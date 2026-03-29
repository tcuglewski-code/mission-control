import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { createNotification, getAuthUserIdByUserId } from "@/lib/notifications";

/**
 * POST /api/tasks/bulk-unblock
 * Body: { blockerTaskId: string }
 *
 * Wenn ein Blocker-Task erledigt wird:
 * - Alle Tasks finden, die durch diesen Task blockiert werden
 * - Benachrichtigungen senden wenn keine aktiven Blocker mehr vorhanden
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { blockerTaskId } = body;

    if (!blockerTaskId) {
      return NextResponse.json({ error: "blockerTaskId erforderlich" }, { status: 400 });
    }

    // Alle blockierten Tasks ermitteln
    const blockerDeps = await prisma.taskDependency.findMany({
      where: { dependsOnId: blockerTaskId, isBlocker: true },
      select: { taskId: true },
    });

    if (blockerDeps.length === 0) {
      return NextResponse.json({ notified: 0, unblocked: [] });
    }

    const blockedTaskIds = blockerDeps.map((d) => d.taskId);

    const blockedTasks = await prisma.task.findMany({
      where: { id: { in: blockedTaskIds } },
      select: { id: true, title: true, assigneeId: true },
    });

    const blockerTask = await prisma.task.findUnique({
      where: { id: blockerTaskId },
      select: { title: true },
    });

    const unblockedTasks: string[] = [];
    let notified = 0;

    for (const blockedTask of blockedTasks) {
      // Prüfe ob noch weitere aktive Blocker existieren
      const remainingBlockers = await prisma.taskDependency.findMany({
        where: { taskId: blockedTask.id, isBlocker: true, dependsOnId: { not: blockerTaskId } },
        select: { dependsOnId: true },
      });

      const remainingActiveTasks = await prisma.task.findMany({
        where: {
          id: { in: remainingBlockers.map((b) => b.dependsOnId) },
          status: { not: "done" },
        },
        select: { id: true },
      });

      if (remainingActiveTasks.length === 0) {
        unblockedTasks.push(blockedTask.id);

        if (blockedTask.assigneeId) {
          const authUserId = await getAuthUserIdByUserId(blockedTask.assigneeId);
          if (authUserId) {
            await createNotification(
              authUserId,
              "blocker_resolved",
              "Blocker erledigt ✅",
              `Du kannst jetzt mit „${blockedTask.title}" weitermachen — der Blocker „${blockerTask?.title}" wurde erledigt.`,
              `/tasks`
            );
            notified++;
          }
        }
      }
    }

    return NextResponse.json({ notified, unblocked: unblockedTasks });
  } catch (error) {
    console.error("[POST /api/tasks/bulk-unblock]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * GET /api/tasks/bulk-unblock?filter=blocked
 * Gibt alle blockierten Tasks zurück (haben aktive isBlocker-Abhängigkeiten)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Alle aktiven Blocker-Abhängigkeiten ermitteln
    const blockerDeps = await prisma.taskDependency.findMany({
      where: { isBlocker: true },
      select: { taskId: true, dependsOnId: true },
    });

    // Status der Blocker-Tasks ermitteln
    const blockerTaskIds = [...new Set(blockerDeps.map((d) => d.dependsOnId))];
    const blockerStatuses = await prisma.task.findMany({
      where: { id: { in: blockerTaskIds } },
      select: { id: true, status: true },
    });
    const blockerStatusMap = new Map(blockerStatuses.map((t) => [t.id, t.status]));

    // Nur Deps bei denen der Blocker noch nicht done ist
    const activeDeps = blockerDeps.filter(
      (d) => blockerStatusMap.get(d.dependsOnId) !== "done"
    );

    const activelyBlockedTaskIds = [...new Set(activeDeps.map((d) => d.taskId))];

    if (activelyBlockedTaskIds.length === 0) {
      return NextResponse.json([]);
    }

    const accessFilter = user.role !== "admin"
      ? { projectId: { in: user.projectAccess } }
      : {};

    const blockedTasks = await prisma.task.findMany({
      where: {
        id: { in: activelyBlockedTaskIds },
        ...accessFilter,
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

    // isBlocked-Flag hinzufügen
    return NextResponse.json(blockedTasks.map((t) => ({ ...t, isBlocked: true })));
  } catch (error) {
    console.error("[GET /api/tasks/bulk-unblock]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
