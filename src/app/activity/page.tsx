import { AppShell } from "@/components/layout/AppShell";
import { ActivityTimelineClient } from "./ActivityTimelineClient";
import { prisma } from "@/lib/prisma";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";

export default async function ActivityPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const projects = await prisma.project.findMany({
    where: allowedIds !== null ? { id: { in: allowedIds } } : {},
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatar: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell title="Aktivitäts-Timeline" subtitle="Alle Aktivitäten · Echtzeit">
      <ActivityTimelineClient projects={projects} users={users} />
    </AppShell>
  );
}
