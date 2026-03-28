import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcNextDueDate, type RecurringIntervalType } from "@/lib/recurring";

/**
 * GET /api/recurring/generate
 * Vercel Cron Handler: täglich um 00:00 Uhr
 * Erstellt die nächsten Instanzen für alle aktiven wiederkehrenden Tasks.
 */
export async function GET(req: NextRequest) {
  try {
    // Cron-Secret prüfen (von Vercel automatisch gesetzt)
    const authHeader = req.headers.get("authorization");
    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      process.env.NODE_ENV !== "development"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let created = 0;
    let skipped = 0;

    // Alle aktiven Root-Recurring-Tasks laden (kein parentTaskId, recurring=true, nicht abgeschlossen)
    const recurringTasks = await prisma.task.findMany({
      where: {
        recurring: true,
        parentTaskId: null,
        status: { not: "done" },
        OR: [
          { recurringEndDate: null },
          { recurringEndDate: { gt: now } },
        ],
      },
    });

    for (const task of recurringTasks) {
      if (!task.recurringInterval) continue;

      // Finde die jüngste offene Kind-Task
      const latestChild = await prisma.task.findFirst({
        where: {
          parentTaskId: task.id,
          status: { not: "done" },
        },
        orderBy: { dueDate: "desc" },
      });

      // Wenn bereits eine offene Instanz existiert → überspringen
      if (latestChild) {
        skipped++;
        continue;
      }

      // Berechne nächstes Fälligkeitsdatum
      const baseDue = task.dueDate ?? now;
      const nextDue = calcNextDueDate(
        baseDue,
        task.recurringInterval as RecurringIntervalType,
        task.recurringDay
      );

      // Nur erstellen wenn das Datum nicht in der Vergangenheit liegt
      // (oder heute/morgen = fällig)
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + 1); // bis morgen

      if (nextDue > cutoff) {
        skipped++;
        continue;
      }

      // Neue Instanz erstellen
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
          parentTaskId: task.id,
        },
      });

      created++;
      console.log(`[CRON recurring] Neue Instanz erstellt für Task "${task.title}" → fällig: ${nextDue.toISOString()}`);
    }

    console.log(`[CRON recurring] Fertig: ${created} erstellt, ${skipped} übersprungen`);

    return NextResponse.json({
      ok: true,
      created,
      skipped,
      total: recurringTasks.length,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("[CRON /api/recurring/generate]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
