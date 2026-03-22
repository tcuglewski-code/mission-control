import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { TeamClient } from "./TeamClient";
import { requireServerSession } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const session = await requireServerSession();

  if (!hasPermission(session, PERMISSIONS.TEAM_VIEW)) {
    redirect("/dashboard");
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
