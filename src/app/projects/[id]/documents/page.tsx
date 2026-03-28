import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { ChevronLeft, FolderOpen } from "lucide-react";
import { DocumentsClient } from "@/app/documents/DocumentsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  // Zugriffsprüfung
  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const allProjects = await prisma.project.findMany({
    where: allowedIds ? { id: { in: allowedIds } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const docs = await prisma.fileDoc.findMany({
    where: { projectId: id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const username = session.username ?? "System";

  // Serialize Dates to strings for client component
  const serializedDocs = docs.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <AppShell
      title={`${project.name} — Dokumente`}
      subtitle="Projektbezogene Dateien & Links"
      noScroll
    >
      {/* Navigation zurück */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] shrink-0">
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <FolderOpen className="w-4 h-4" />
          {project.name}
        </Link>
        <span className="text-zinc-700 text-sm">/ Dokumente</span>
      </div>

      <div className="flex-1 min-h-0">
        <DocumentsClient
          initialDocs={serializedDocs}
          projects={allProjects}
          uploaderName={username}
        />
      </div>
    </AppShell>
  );
}
