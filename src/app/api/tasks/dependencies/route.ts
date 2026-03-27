import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/tasks/dependencies?taskId=xxx — Abhängigkeiten für eine Task
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId erforderlich" }, { status: 400 });
    }

    // Alle Abhängigkeiten dieser Task laden
    const abhaengigkeiten = await prisma.taskDependency.findMany({
      where: { taskId },
    });

    // Details der Abhängigkeits-Tasks laden
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

    return NextResponse.json({
      taskId,
      dependsOn: abhaengigkeitsTasks,
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

    // Zirkuläre Abhängigkeit prüfen (einfache 1-Level-Prüfung)
    const zirkel = await prisma.taskDependency.findFirst({
      where: { taskId: dependsOnId, dependsOnId: taskId },
    });
    if (zirkel) {
      return NextResponse.json(
        { error: "Zirkuläre Abhängigkeit erkannt" },
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
