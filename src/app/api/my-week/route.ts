import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

// GET /api/my-week?date=2024-03-28 (any date in the desired week)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve AuthUser → User by email
  const authUser = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  const appUser = authUser?.email
    ? await prisma.user.findUnique({ where: { email: authUser.email } })
    : null;
  const appUserId = appUser?.id ?? null;

  const dateParam = new URL(req.url).searchParams.get("date");
  const baseDate = dateParam ? new Date(dateParam) : new Date();
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Montag
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  // Erledigte Tasks dieser Woche (die mir zugewiesen sind oder zu meinen Projekten gehören)
  const doneTasks = await prisma.task.findMany({
    where: {
      status: "done",
      updatedAt: { gte: startOfDay(weekStart), lte: endOfDay(weekEnd) },
      ...(appUserId ? { assigneeId: appUserId } : {}),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      timeEntries: {
        where: {
          startTime: { gte: startOfDay(weekStart), lte: endOfDay(weekEnd) },
        },
        select: { duration: true, startTime: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Zeiterfassung diese Woche
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      startTime: { gte: startOfDay(weekStart), lte: endOfDay(weekEnd) },
      ...(appUserId ? { userId: appUserId } : {}),
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { name: true, color: true } },
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    doneTasks,
    timeEntries,
    totalMinutes,
    stats: {
      tasksDone: doneTasks.length,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    },
  });
}
