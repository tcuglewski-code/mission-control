import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, CheckSquare, Users, FileText, Activity } from "lucide-react";
import { getStatusBg, getStatusLabel, formatRelativeTime, getActionLabel, getEntityTypeLabel, getInitials } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { tasks: true, members: true, docs: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatar: true, role: true, email: true } } },
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      docs: { orderBy: { updatedAt: "desc" }, take: 5 },
      logs: {
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) notFound();

  const tasksByStatus = {
    backlog: project.tasks.filter((t) => t.status === "backlog").length,
    in_progress: project.tasks.filter((t) => t.status === "in_progress").length,
    in_review: project.tasks.filter((t) => t.status === "in_review").length,
    done: project.tasks.filter((t) => t.status === "done").length,
  };

  return (
    <AppShell title={project.name} subtitle={`Projekt · ${getStatusLabel(project.status)}`}>
      <div className="p-6 space-y-6">
        {/* Back */}
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Alle Projekte
        </Link>

        {/* Header */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{
                  backgroundColor: `${project.color}20`,
                  color: project.color,
                  border: `1px solid ${project.color}30`,
                }}
              >
                {project.name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-zinc-400 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded border ${getStatusBg(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-zinc-400">Fortschritt</span>
              <span className="text-xs text-white font-semibold">{project.progress}%</span>
            </div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${project.progress}%`, backgroundColor: project.color }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-[#2a2a2a]">
            {[
              { label: "Backlog", value: tasksByStatus.backlog, color: "text-zinc-400" },
              { label: "In Progress", value: tasksByStatus.in_progress, color: "text-orange-400" },
              { label: "In Review", value: tasksByStatus.in_review, color: "text-blue-400" },
              { label: "Done", value: tasksByStatus.done, color: "text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-zinc-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white">Tasks</h2>
                <span className="text-xs text-zinc-600">({project._count.tasks})</span>
              </div>
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        task.status === "done"
                          ? "bg-emerald-500"
                          : task.status === "in_progress"
                          ? "bg-orange-500"
                          : task.status === "in_review"
                          ? "bg-blue-500"
                          : "bg-zinc-600"
                      }`}
                    />
                    <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                    {task.assignee && (
                      <span className="text-[11px] text-zinc-500">{task.assignee.name}</span>
                    )}
                    {task.dueDate && (
                      <span className="text-[11px] text-zinc-600">
                        {format(new Date(task.dueDate), "d. MMM", { locale: de })}
                      </span>
                    )}
                  </div>
                ))}
                {project.tasks.length === 0 && (
                  <p className="text-center text-zinc-600 text-sm py-6">Keine Tasks</p>
                )}
              </div>
            </div>

            {/* Docs */}
            {project.docs.length > 0 && (
              <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-white">Dokumente</h2>
                </div>
                <div className="space-y-2">
                  {project.docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg">
                      <span className="text-sm text-white">{doc.title}</span>
                      <span className="text-[11px] text-zinc-600">v{doc.version}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Members */}
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white">Team</h2>
              </div>
              <div className="space-y-3">
                {project.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300">
                      {getInitials(m.user.name)}
                    </div>
                    <div>
                      <p className="text-xs text-white">{m.user.name}</p>
                      <p className="text-[10px] text-zinc-600">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white">Activity</h2>
              </div>
              <div className="space-y-3">
                {project.logs.map((log) => (
                  <div key={log.id} className="text-xs text-zinc-400">
                    <span className="text-zinc-300">{log.user?.name ?? "System"}</span>
                    {" "}{getActionLabel(log.action)}{" "}
                    <span className="text-zinc-500">{log.entityName}</span>
                    <div className="text-zinc-600 mt-0.5">{formatRelativeTime(log.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
