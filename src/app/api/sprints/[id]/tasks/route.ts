import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/sprints/[id]/tasks
 * Weist Tasks einem Sprint zu oder entfernt sie.
 * Body: { taskIds: string[], action: "assign" | "remove" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { taskIds, action } = body as {
      taskIds: string[];
      action: "assign" | "remove";
    };

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "taskIds muss ein nicht-leeres Array sein" }, { status: 400 });
    }

    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint nicht gefunden" }, { status: 404 });
    }

    if (action === "assign") {
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { sprintId: id },
      });
    } else if (action === "remove") {
      await prisma.task.updateMany({
        where: { id: { in: taskIds }, sprintId: id },
        data: { sprintId: null },
      });
    } else {
      return NextResponse.json({ error: "Ungültige Aktion. Erlaubt: assign | remove" }, { status: 400 });
    }

    // Aktualisierter Sprint mit Tasks zurückgeben
    const updated = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            storyPoints: true,
            assignee: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/sprints/[id]/tasks]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
