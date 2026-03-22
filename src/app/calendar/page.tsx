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
      <AppShell title="Kalender" subtitle="Termine & Events">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Du hast keine Berechtigung für den Kalender.</p>
        </div>
      </AppShell>
    );
  }

  const allowedIds = getAllowedProjectIds(session);

  let events;
  if (allowedIds === null) {
    // Admin: alle Events
    events = await prisma.event.findMany({
      include: { task: { select: { id: true, title: true, status: true } } },
      orderBy: { startTime: "asc" },
    });
  } else {
    // Non-admin: Events die entweder keiner Task zugeordnet sind,
    // oder deren Task zu einem erlaubten Projekt gehört
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

  return (
    <AppShell title="Kalender" subtitle="Termine & Events">
      <div className="p-6 h-full">
        <CalendarWrapper initialEvents={events} />
      </div>
    </AppShell>
  );
}
