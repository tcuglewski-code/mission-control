import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarWrapper } from "./CalendarWrapper";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await requireServerSession();

  if (!hasPermission(session, PERMISSIONS.CALENDAR_VIEW)) {
    redirect("/dashboard");
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
