import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { TeamClient } from "./TeamClient";
import { requireServerSession } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { startOfWeek, startOfMonth } from "date-fns";

export default async function TeamPage() {
  const session = await requireServerSession();
  const hasAccess = hasPermission(session, PERMISSIONS.TEAM_VIEW);

  if (!hasAccess) {
    return (
      <AppShell title="Team" subtitle="KI-Agenten & Menschen">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Du hast keine Berechtigung für das Team-Modul.</p>
        </div>
      </AppShell>
    );
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const [users, timeEntries] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        description: true,
        tools: true,
        skills: true,
        weeklyCapacity: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Zeit-Einträge für Woche + Monat laden
    prisma.timeEntry.findMany({
      where: {
        endTime: { not: null },
        startTime: { gte: monthStart },
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        duration: true,
        startTime: true,
      },
    }),
  ]);

  // Wochenstunden + Monatsstunden pro User aggregieren
  const userTimeStats: Record<string, { weekMinutes: number; monthMinutes: number }> = {};
  timeEntries.forEach((e) => {
    if (!e.userId) return;
    if (!userTimeStats[e.userId]) {
      userTimeStats[e.userId] = { weekMinutes: 0, monthMinutes: 0 };
    }
    const isThisWeek = new Date(e.startTime) >= weekStart;
    userTimeStats[e.userId].monthMinutes += e.duration ?? 0;
    if (isThisWeek) {
      userTimeStats[e.userId].weekMinutes += e.duration ?? 0;
    }
  });

  return (
    <AppShell title="Team" subtitle="KI-Agenten & Menschen">
      <div className="p-6">
        <TeamClient initialUsers={users} userTimeStats={userTimeStats} />
      </div>
    </AppShell>
  );
}
