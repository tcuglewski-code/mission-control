import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { TeamClient } from "./TeamClient";
import { requireServerSession } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

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

  const users = await prisma.user.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Team" subtitle="KI-Agenten & Menschen">
      <div className="p-6">
        <TeamClient initialUsers={users} />
      </div>
    </AppShell>
  );
}
