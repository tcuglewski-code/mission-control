import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, getProjectMemberIds } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: { select: { id: true, status: true, storyPoints: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sprint nicht gefunden" }, { status: 404 });
    }

    if (existing.status === "completed") {
      return NextResponse.json({ error: "Sprint ist bereits abgeschlossen" }, { status: 400 });
    }

    // Abgeschlossene Story Points berechnen
    const doneTasks = existing.tasks.filter((t) => t.status === "done");
    const completedPoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
    const totalPoints = existing.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

    // Nicht-Done Tasks zurück in Backlog verschieben
    const remainingTaskIds = existing.tasks
      .filter((t) => t.status !== "done")
      .map((t) => t.id);

    if (remainingTaskIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: remainingTaskIds } },
        data: { sprintId: null, status: "todo" },
      });
    }

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        status: "completed",
        endDate: existing.endDate ?? new Date(),
        completedPoints,
        storyPoints: totalPoints > 0 ? totalPoints : existing.storyPoints,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: { select: { id: true, status: true, title: true, storyPoints: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "completed",
        entityType: "sprint",
        entityId: sprint.id,
        entityName: sprint.name,
        projectId: sprint.projectId,
        metadata: JSON.stringify({ completedPoints, totalPoints, remainingMoved: remainingTaskIds.length }),
      },
    });

    // Benachrichtigung: Sprint abgeschlossen → alle Projektmitglieder
    if (sprint.projectId) {
      void (async () => {
        const memberIds = await getProjectMemberIds(sprint.projectId!);
        for (const memberId of memberIds) {
          await createNotification(
            memberId,
            "sprint_completed",
            "Sprint abgeschlossen",
            `Der Sprint „${sprint.name}" wurde abgeschlossen. ${completedPoints} von ${totalPoints} Story Points erledigt.`,
            `/projects/${sprint.projectId}/sprints`
          );
        }
      })();
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("[POST /api/sprints/[id]/complete]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
