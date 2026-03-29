import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { ProjectSprintsClient } from "./ProjectSprintsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSprintsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  });

  if (!project) notFound();

  const sprints = await prisma.sprint.findMany({
    where: { projectId: id },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          storyPoints: true,
          sprintId: true,
          projectId: true,
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Füge projectId zu jedem Sprint hinzu
  const sprintsWithProjectId = sprints.map((s) => ({ ...s, projectId: id }));

  // Backlog-Tasks: Tasks im Projekt ohne Sprint-Zuweisung
  const backlogTasks = await prisma.task.findMany({
    where: {
      projectId: id,
      sprintId: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      storyPoints: true,
      sprintId: true,
      projectId: true,
      assignee: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell 
      title={`Sprints — ${project.name}`} 
      subtitle="Sprint-Planung & Backlog-Verwaltung"
    >
      <ProjectSprintsClient
        project={project}
        initialSprints={sprintsWithProjectId as any}
        initialBacklogTasks={backlogTasks as any}
      />
    </AppShell>
  );
}
