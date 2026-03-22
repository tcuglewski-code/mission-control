import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryClient } from "./MemoryClient";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function MemoryPage() {
  const session = await requireServerSession();
  const hasAccess = hasPermission(session, PERMISSIONS.MEMORY_VIEW);

  if (!hasAccess) {
    return (
      <AppShell title="Memory" subtitle="Journal & Langzeit-Gedächtnis" noScroll>
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Du hast keine Berechtigung für das Memory-Modul.</p>
        </div>
      </AppShell>
    );
  }

  const allowedIds = getAllowedProjectIds(session);

  const entries = await prisma.memoryEntry.findMany({
    where: allowedIds
      ? { OR: [{ projectId: null }, { projectId: { in: allowedIds } }] }
      : {},
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell title="Memory" subtitle="Journal & Langzeit-Gedächtnis" noScroll>
      <div className="h-full">
        <MemoryClient initialEntries={entries} />
      </div>
    </AppShell>
  );
}
