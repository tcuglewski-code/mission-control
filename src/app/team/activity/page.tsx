import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { TeamActivityClient } from "./TeamActivityClient";
import { startOfDay, startOfWeek } from "date-fns";

export default async function TeamActivityPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const todayStart = startOfDay(new Date());

  // Letzten 7 Tage Activity Logs
  const whereBase =
    session.role !== "admin" && allowedIds !== null
      ? allowedIds.length > 0
        ? { projectId: { in: allowedIds } }
        : { id: "__none__" }
      : {};

  const [logs, users] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        ...whereBase,
        createdAt: { gte: weekStart },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // Alle User für Filter
    prisma.user.findMany({
      select: { id: true, name: true, avatar: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Zeitgruppen
  const todayLogs = logs.filter((l) => new Date(l.createdAt) >= todayStart);
  const weekLogs = logs.filter(
    (l) => new Date(l.createdAt) >= weekStart && new Date(l.createdAt) < todayStart
  );

  return (
    <AppShell title="Team-Aktivität" subtitle="Was hat wer heute & diese Woche gemacht?">
      <div className="p-6">
        <TeamActivityClient
          todayLogs={todayLogs.map((l) => ({
            id: l.id,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            entityName: l.entityName,
            userId: l.userId ?? null,
            userEmail: l.userEmail ?? null,
            projectId: l.projectId ?? null,
            metadata: l.metadata ?? null,
            createdAt: l.createdAt.toISOString(),
            user: l.user ?? null,
            project: l.project ?? null,
          }))}
          weekLogs={weekLogs.map((l) => ({
            id: l.id,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            entityName: l.entityName,
            userId: l.userId ?? null,
            userEmail: l.userEmail ?? null,
            projectId: l.projectId ?? null,
            metadata: l.metadata ?? null,
            createdAt: l.createdAt.toISOString(),
            user: l.user ?? null,
            project: l.project ?? null,
          }))}
          users={users}
        />
      </div>
    </AppShell>
  );
}
