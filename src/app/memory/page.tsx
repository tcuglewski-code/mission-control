import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryClient } from "./MemoryClient";

export default async function MemoryPage() {
  const entries = await prisma.memoryEntry.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell title="Memory" subtitle="Knowledge Base & Context">
      <div className="p-6">
        <MemoryClient initialEntries={entries} />
      </div>
    </AppShell>
  );
}
