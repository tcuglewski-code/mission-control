import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { tasks: true, members: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell title="Projects" subtitle="All Projects">
      <div className="p-6">
        <ProjectsClient initialProjects={projects} />
      </div>
    </AppShell>
  );
}
