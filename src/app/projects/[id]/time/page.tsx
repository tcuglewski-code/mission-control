import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft, Clock } from "lucide-react";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { ProjectZeiterfassung } from "@/components/time/ProjectZeiterfassung";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectTimePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      color: true,
      hourBudget: true,
      tasks: {
        select: {
          id: true,
          title: true,
          timeEntries: {
            select: {
              id: true,
              duration: true,
              startTime: true,
              endTime: true,
              userId: true,
              billable: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <AppShell title={`${project.name} — Zeiterfassung`} subtitle="Projekt · Stunden-Auswertung">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Zurück zum Projekt
          </Link>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            <span className="text-xs text-zinc-400">{project.name}</span>
          </div>
        </div>

        <ProjectZeiterfassung project={project as any} />
      </div>
    </AppShell>
  );
}
