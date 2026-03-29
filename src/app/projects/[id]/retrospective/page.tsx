import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { RetrospectiveClient } from "./RetrospectiveClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sprintId?: string }>;
}

export default async function RetrospectivePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sprintId } = await searchParams;

  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);
  if (allowedIds !== null && !allowedIds.includes(id)) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  });
  if (!project) notFound();

  // Alle abgeschlossenen Sprints des Projekts
  const sprints = await prisma.sprint.findMany({
    where: { projectId: id },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      storyPoints: true,
      completedPoints: true,
      tasks: { select: { id: true, status: true, storyPoints: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Lade bestehende Retrospektive falls sprintId übergeben
  let retro = null;
  if (sprintId) {
    retro = await prisma.retrospective.findUnique({
      where: { sprintId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
  }

  return (
    <AppShell
      title={`Retrospektive — ${project.name}`}
      subtitle="Was lief gut? Was verbessern wir?"
    >
      <RetrospectiveClient
        project={project}
        sprints={sprints as any}
        initialRetro={retro as any}
        initialSprintId={sprintId ?? null}
      />
    </AppShell>
  );
}
