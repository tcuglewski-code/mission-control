import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { startOfDay, endOfDay } from "date-fns";
import { MeinTagClient } from "./MeinTagClient";

export default async function MeinTagPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  // Resolve AuthUser → User by email
  const authUser = await prisma.authUser.findUnique({ where: { id: session.id } });
  const appUser = authUser?.email
    ? await prisma.user.findUnique({ where: { email: authUser.email } })
    : null;
  const appUserId = appUser?.id ?? null;

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const todayStr = today.toISOString().split("T")[0];

  // Tasks die heute fällig sind ODER mir zugewiesen + aktiv
  const todayTasks = await prisma.task.findMany({
    where: {
      status: { not: "done" },
      ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      OR: [
        { dueDate: { gte: todayStart, lte: todayEnd } },
        ...(appUserId ? [{ assigneeId: appUserId }] : []),
      ],
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      timeEntries: {
        where: { endTime: null },
        take: 1,
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  // Bereits erledigte Tasks heute (für Fortschritts-Bar)
  const doneTodayCount = await prisma.task.count({
    where: {
      status: "done",
      updatedAt: { gte: todayStart, lte: todayEnd },
      ...(appUserId ? { assigneeId: appUserId } : {}),
    },
  });

  // Laufende Zeiterfassung
  const runningTimer = appUserId
    ? await prisma.timeEntry.findFirst({
        where: { userId: appUserId, endTime: null },
        include: { task: { select: { id: true, title: true } } },
      })
    : null;

  // Fokus-Tasks für heute
  const focusEntries = await (prisma as any).userTaskFocus.findMany({
    where: { userId: session.id, date: todayStr },
  });
  const focusTaskIds: string[] = focusEntries.map((e: any) => e.taskId);

  // Tagesnotiz
  const dayNote = await (prisma as any).userDayNote.findUnique({
    where: { userId_date: { userId: session.id, date: todayStr } },
  });

  const totalTasks = todayTasks.length + doneTodayCount;

  return (
    <AppShell title="Mein Tag" subtitle={`${today.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`}>
      <MeinTagClient
        tasks={todayTasks as any}
        doneTodayCount={doneTodayCount}
        totalTasks={totalTasks}
        focusTaskIds={focusTaskIds}
        dayNote={dayNote?.content ?? ""}
        runningTimer={runningTimer as any}
        todayStr={todayStr}
        userId={session.id}
      />
    </AppShell>
  );
}
