import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/tasks/dependencies?taskId=xxx — Abhängigkeiten für eine Task
// GET /api/tasks/dependencies?all=true — Alle Abhängigkeiten (für Gantt-Ansicht)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const taskId = searchParams.get("taskId");

    // Alle Abhängigkeiten zurückgeben (für Gantt-Timeline)
    if (all) {
      const allDeps = await prisma.taskDependency.findMany({
        select: { taskId: true, dependsOnId: true },
      });
      return NextResponse.json(allDeps);
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
        project: { select: { id: true, name: true, color: true } },
      },
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
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({
      taskId,
      dependsOn: abhaengigkeitsTasks,
      blocking: blockiertTasks,
    });
  } catch (error) {
    console.error("[GET /api/tasks/dependencies]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/tasks/dependencies — Abhängigkeit hinzufügen
// Body: { taskId, dependsOnId }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, dependsOnId } = body;

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
    // (d.h. ist taskId ein Vorfahre von dependsOnId?)
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
      update: {},
      create: { taskId, dependsOnId },
    });

    return NextResponse.json(abhaengigkeit, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks/dependencies]", error);
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
