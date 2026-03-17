import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { TeamClient } from "./TeamClient";

export default async function TeamPage() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Team" subtitle="Members & Agents">
      <div className="p-6">
        <TeamClient initialUsers={users} />
      </div>
    </AppShell>
  );
}
