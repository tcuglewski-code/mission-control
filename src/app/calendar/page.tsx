import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarWrapper } from "./CalendarWrapper";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function CalendarPage() {
  const session = await requireServerSession();
  const hasAccess = hasPermission(session, PERMISSIONS.CALENDAR_VIEW);

  if (!hasAccess) {
    return (
      <AppShell title="Kalender" subtitle="Aufgaben & Termine">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Du hast keine Berechtigung für den Kalender.</p>
        </div>
      </AppShell>
    );
  }

  const allowedIds = getAllowedProjectIds(session);

  // Load events
  let events;
  if (allowedIds === null) {
    events = await prisma.event.findMany({
      include: { task: { select: { id: true, title: true, status: true } } },
      orderBy: { startTime: "asc" },
    });
  } else {
    const allowedTaskIds = await prisma.task
      .findMany({
        where: { projectId: { in: allowedIds } },
        select: { id: true },
      })
      .then((tasks) => tasks.map((t) => t.id));

    events = await prisma.event.findMany({
      where: {
        OR: [
          { taskId: null },
          { taskId: { in: allowedTaskIds } },
        ],
      },
      include: { task: { select: { id: true, title: true, status: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  // Load tasks with dueDate for the task calendar
  const taskWhere =
    allowedIds !== null
      ? { projectId: { in: allowedIds }, dueDate: { not: null } }
      : { dueDate: { not: null } };

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      sprint: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true, color: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // Load projects + users for TaskModal
  const projectWhere = allowedIds !== null ? { id: { in: allowedIds } } : {};
  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, color: true, status: true, progress: true, priority: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell title="Kalender" subtitle="Aufgaben & Termine">
      <div className="p-6 h-full">
        <CalendarWrapper
          initialEvents={events}
          initialTasks={tasks}
          projects={projects}
          users={users}
        />
      </div>
    </AppShell>
  );
}
