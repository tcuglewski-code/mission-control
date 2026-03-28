import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { createNotification, getAuthUserIdByUserId } from "@/lib/notifications";

// GET /api/tasks/dependencies?taskId=xxx — Abhängigkeiten für eine Task
// GET /api/tasks/dependencies?all=true — Alle Abhängigkeiten (für Gantt-Ansicht)
// GET /api/tasks/dependencies?blockers=true — Nur Blocker-Abhängigkeiten
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const blockersOnly = searchParams.get("blockers") === "true";
    const taskId = searchParams.get("taskId");

    // Alle Abhängigkeiten zurückgeben (für Gantt-Timeline / Blocker-Berechnung)
    if (all) {
      const allDeps = await prisma.taskDependency.findMany({
        select: { taskId: true, dependsOnId: true, isBlocker: true },
      });
      return NextResponse.json(allDeps);
    }

    // Nur Blocker-Abhängigkeiten (für Client-seitige isBlocked-Berechnung)
    if (blockersOnly) {
      const blockerDeps = await prisma.taskDependency.findMany({
        where: { isBlocker: true },
        select: { taskId: true, dependsOnId: true },
      });
      return NextResponse.json(blockerDeps);
    }

    if (!taskId) {
      return NextResponse.json({ error: "taskId oder all=true erforderlich" }, { status: 400 });
    }

    // Alle Abhängigkeiten dieser Task laden
    const abhaengigkeiten = await prisma.taskDependency.findMany({
      where: { taskId },
    });

    // Tasks die DIESE Task blockieren (Vorgänger)
    const dependsOnIds = abhaengigkeiten.map((d) => d.dependsOnId);
    const abhaengigkeitsTasks = await prisma.task.findMany({
      where: { id: { in: dependsOnIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });

    // isBlocker-Info pro Abhängigkeit
    const depWithBlocker = abhaengigkeitsTasks.map((t) => {
      const dep = abhaengigkeiten.find((d) => d.dependsOnId === t.id);
      return { ...t, isBlocker: dep?.isBlocker ?? false };
    });

    // Tasks die DURCH DIESE Task blockiert werden (Nachfolger)
    const blockiertDeps = await prisma.taskDependency.findMany({
      where: { dependsOnId: taskId },
    });
    const blockiertIds = blockiertDeps.map((d) => d.taskId);
    const blockiertTasks = await prisma.task.findMany({
      where: { id: { in: blockiertIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true, color: true } },
      },
    });

    // isBlocker-Info für Nachfolger
    const blockiertWithType = blockiertTasks.map((t) => {
      const dep = blockiertDeps.find((d) => d.taskId === t.id);
      return { ...t, isBlocker: dep?.isBlocker ?? false };
    });

    // Aktive Blocker (Vorgänger mit isBlocker=true, die noch nicht erledigt sind)
    const activeBlockers = depWithBlocker.filter((t) => t.isBlocker && t.status !== "done");

    return NextResponse.json({
      taskId,
      dependsOn: depWithBlocker,
      blocking: blockiertWithType,
      isBlocked: activeBlockers.length > 0,
      activeBlockers,
    });
  } catch (error) {
    console.error("[GET /api/tasks/dependencies]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/tasks/dependencies — Abhängigkeit hinzufügen
// Body: { taskId, dependsOnId, isBlocker? }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, dependsOnId, isBlocker = false } = body;

    if (!taskId || !dependsOnId) {
      return NextResponse.json(
        { error: "taskId und dependsOnId sind erforderlich" },
        { status: 400 }
      );
    }

    if (taskId === dependsOnId) {
      return NextResponse.json(
        { error: "Eine Task kann nicht von sich selbst abhängen" },
        { status: 400 }
      );
    }

    // Tiefe Zirkel-Prüfung: Würde taskId erreichbar sein von dependsOnId ausgehend?
    async function istVorfahre(startId: string, zielId: string, besucht = new Set<string>()): Promise<boolean> {
      if (startId === zielId) return true;
      if (besucht.has(startId)) return false;
      besucht.add(startId);
      const vorfahren = await prisma.taskDependency.findMany({
        where: { taskId: startId },
        select: { dependsOnId: true },
      });
      for (const v of vorfahren) {
        if (await istVorfahre(v.dependsOnId, zielId, besucht)) return true;
      }
      return false;
    }

    const hatZirkel = await istVorfahre(dependsOnId, taskId);
    if (hatZirkel) {
      return NextResponse.json(
        { error: "Zirkuläre Abhängigkeit erkannt — diese Verknüpfung würde einen Kreislauf erzeugen" },
        { status: 400 }
      );
    }

    const abhaengigkeit = await prisma.taskDependency.upsert({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
      update: { isBlocker },
      create: { taskId, dependsOnId, isBlocker },
    });

    return NextResponse.json(abhaengigkeit, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks/dependencies]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH /api/tasks/dependencies — isBlocker-Flag updaten
// Body: { taskId, dependsOnId, isBlocker }
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, dependsOnId, isBlocker } = body;

    if (!taskId || !dependsOnId || isBlocker === undefined) {
      return NextResponse.json({ error: "taskId, dependsOnId und isBlocker sind erforderlich" }, { status: 400 });
    }

    const updated = await prisma.taskDependency.updateMany({
      where: { taskId, dependsOnId },
      data: { isBlocker },
    });

    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (error) {
    console.error("[PATCH /api/tasks/dependencies]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/tasks/dependencies
// Body: { taskId, dependsOnId }
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, dependsOnId } = body;

    await prisma.taskDependency.deleteMany({
      where: { taskId, dependsOnId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/dependencies]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/tasks/dependencies/bulk-unblock — Alle blockierten Tasks freigeben wenn Blocker erledigt
// Wird aufgerufen wenn ein Blocker-Task auf "done" gesetzt wird
export async function notifyBlockedTasksOnCompletion(blockerTaskId: string) {
  try {
    // Alle Tasks finden, die durch diesen Task blockiert werden
    const blockerDeps = await prisma.taskDependency.findMany({
      where: { dependsOnId: blockerTaskId, isBlocker: true },
      select: { taskId: true },
    });

    if (blockerDeps.length === 0) return;

    const blockedTaskIds = blockerDeps.map((d) => d.taskId);

    // Tasks laden
    const blockedTasks = await prisma.task.findMany({
      where: { id: { in: blockedTaskIds } },
      select: {
        id: true,
        title: true,
        assigneeId: true,
      },
    });

    // Blocker-Task laden für Benachrichtigung
    const blockerTask = await prisma.task.findUnique({
      where: { id: blockerTaskId },
      select: { title: true },
    });

    // Für jeden blockierten Task prüfen ob er jetzt keine aktiven Blocker mehr hat
    for (const blockedTask of blockedTasks) {
      const remainingBlockers = await prisma.taskDependency.findMany({
        where: { taskId: blockedTask.id, isBlocker: true },
        select: { dependsOnId: true },
      });

      const remainingBlockerTasks = await prisma.task.findMany({
        where: {
          id: { in: remainingBlockers.map((b) => b.dependsOnId) },
          status: { not: "done" },
        },
        select: { id: true },
      });

      // Wenn keine aktiven Blocker mehr → Benachrichtigung senden
      if (remainingBlockerTasks.length === 0 && blockedTask.assigneeId) {
        const authUserId = await getAuthUserIdByUserId(blockedTask.assigneeId);
        if (authUserId) {
          await createNotification(
            authUserId,
            "blocker_resolved",
            "Blocker erledigt ✅",
            `Du kannst jetzt mit „${blockedTask.title}" weitermachen — der Blocker „${blockerTask?.title}" wurde erledigt.`,
            `/tasks`
          );
        }
      }
    }
  } catch (error) {
    console.error("[notifyBlockedTasksOnCompletion]", error);
  }
}
