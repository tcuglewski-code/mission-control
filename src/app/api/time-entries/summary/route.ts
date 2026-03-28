import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/time-entries/summary?projectId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  // Alle abgeschlossenen Einträge mit Task-Relation laden
  const entries = await prisma.timeEntry.findMany({
    where: {
      endTime: { not: null },
      ...(projectId
        ? { task: { projectId } }
        : {}),
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  // Gesamt-Minuten berechnen
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  // Pro Projekt gruppieren
  const byProject: Record<string, { projectId: string; projectName: string; color: string; totalMinutes: number; entryCount: number }> = {};
  for (const e of entries) {
    const pid = e.task.projectId ?? "no-project";
    const pname = e.task.project?.name ?? "Kein Projekt";
    const pcolor = e.task.project?.color ?? "#6b7280";
    if (!byProject[pid]) {
      byProject[pid] = { projectId: pid, projectName: pname, color: pcolor, totalMinutes: 0, entryCount: 0 };
    }
    byProject[pid].totalMinutes += e.duration ?? 0;
    byProject[pid].entryCount += 1;
  }

  // Diese Woche
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekMinutes = entries
    .filter((e) => new Date(e.startTime) >= weekStart)
    .reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return NextResponse.json({
    totalMinutes,
    weekMinutes,
    byProject: Object.values(byProject),
    entryCount: entries.length,
  });
}
