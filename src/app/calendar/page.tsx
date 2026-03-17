import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarWrapper } from "./CalendarWrapper";

export default async function CalendarPage() {
  const events = await prisma.event.findMany({
    include: { task: { select: { id: true, title: true, status: true } } },
    orderBy: { startTime: "asc" },
  });

  return (
    <AppShell title="Calendar" subtitle="Scheduler & Events">
      <div className="p-6 h-full">
        <CalendarWrapper initialEvents={events} />
      </div>
    </AppShell>
  );
}
