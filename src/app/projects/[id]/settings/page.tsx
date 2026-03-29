import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { ProjectTeamSettings } from "@/components/projects/ProjectTeamSettings";
import Link from "next/link";
import { ChevronLeft, Settings, Share2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Alle User für "Mitglied hinzufügen" Dropdown
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatar: true, role: true },
    orderBy: { name: "asc" },
  });

  const isAdmin = session.role === "admin";
  const membership = project.members.find((m) => m.userId === session.id);
  const isOwner = membership?.role === "owner";
  const canManage = isAdmin || isOwner;

  return (
    <AppShell title={`${project.name} · Einstellungen`} subtitle="Projekt-Einstellungen">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Zurück zum Projekt
          </Link>
        </div>

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
              <Settings className="w-4 h-4 text-zinc-400" />
              Einstellungen — {project.name}
            </h1>
            <p className="text-xs text-zinc-500">Team-Verwaltung & Mitglieder</p>
          </div>
        </div>

        {/* Freigaben-Link */}
        <Link
          href={`/projects/${id}/sharing`}
          className="flex items-center gap-3 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800/30 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Kunden-Freigaben</div>
            <div className="text-xs text-zinc-500">Share-Links für Kunden erstellen und verwalten</div>
          </div>
          <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180 group-hover:text-zinc-400 transition-colors" />
        </Link>

        {/* Team-Tab */}
        <ProjectTeamSettings
          project={{ id: project.id, name: project.name, color: project.color }}
          initialMembers={project.members}
          allUsers={allUsers}
          canManage={canManage}
          currentUserId={session.id}
        />
      </div>
    </AppShell>
  );
}
