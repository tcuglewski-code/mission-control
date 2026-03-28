import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { SprintBoardClient } from "./SprintBoardClient";

interface PageProps {
  params: Promise<{ id: string; sprintId: string }>;
}

export default async function SprintBoardPage({ params }: PageProps) {
  const { id, sprintId } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: { select: { id: true, name: true, color: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!sprint || sprint.projectId !== id) notFound();

  // Backlog-Tasks für Quick-Add
  const backlogTasks = await prisma.task.findMany({
    where: {
      projectId: id,
      sprintId: null,
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell 
      title={sprint.name} 
      subtitle={`Sprint Board — ${sprint.project?.name ?? "Projekt"}`}
    >
      <SprintBoardClient
        sprint={sprint as any}
        backlogTasks={backlogTasks as any}
      />
    </AppShell>
  );
}
