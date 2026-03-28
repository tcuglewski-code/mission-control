import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { SharingClient } from "@/components/projects/SharingClient";
import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSharingPage({ params }: PageProps) {
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
      status: true,
      progress: true,
    },
  });

  if (!project) notFound();

  const shares = await prisma.projectShare.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      label: true,
      expiresAt: true,
      showTimeTracking: true,
      showCosts: true,
      passwordHash: true,
      createdAt: true,
      _count: { select: { guestComments: true } },
    },
  });

  const isAdmin = session.role === "admin" || session.mcRole === "admin";
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <AppShell title={`${project.name} · Freigaben`} subtitle="Kunden-Portal & Share-Links">
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Zurück zum Projekt
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <Link
            href={`/projects/${id}/settings`}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Einstellungen
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: `${project.color}20`,
              color: project.color,
              border: `1px solid ${project.color}30`,
            }}
          >
            {project.name[0]}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-zinc-400" />
              Freigaben — {project.name}
            </h1>
            <p className="text-xs text-zinc-500">Kunden-Share-Links erstellen und verwalten</p>
          </div>
        </div>

        <SharingClient
          projectId={id}
          projectName={project.name}
          projectColor={project.color ?? "#16a34a"}
          initialShares={shares.map((s) => ({
            ...s,
            hasPassword: !!s.passwordHash,
            passwordHash: undefined,
            commentCount: s._count.guestComments,
            shareUrl: `/share/${s.token}`,
            fullUrl: `${baseUrl}/share/${s.token}`,
          }))}
          isAdmin={isAdmin}
          baseUrl={baseUrl}
        />
      </div>
    </AppShell>
  );
}
