import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MemoryClient } from "./MemoryClient";

export default async function MemoryPage() {
  const entries = await prisma.memoryEntry.findMany({
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
