import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryClient } from "./MemoryClient";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MemoryPage() {
  const session = await requireServerSession();

  if (!hasPermission(session, PERMISSIONS.MEMORY_VIEW)) {
    redirect("/dashboard");
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
