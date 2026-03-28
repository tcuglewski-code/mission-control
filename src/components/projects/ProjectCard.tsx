import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Globe, Github } from "lucide-react";
import { getStatusBg, getStatusLabel, getPriorityColor, getPriorityLabel, getInitials } from "@/lib/utils";
import { HealthScoreBadge } from "@/components/projects/HealthScoreBadge";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    progress: number;
    priority: string;
    color: string;
    stack?: string | null;
    githubRepo?: string | null;
    liveUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
    healthScore?: number;
    _count?: { tasks: number; members: number };
    members?: { user: { id: string; name: string; avatar?: string | null } }[];
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-all hover:shadow-lg hover:shadow-black/20 group cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${project.color}20`,
                color: project.color,
                border: `1px solid ${project.color}30`,
              }}
            >
              {project.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                {project.githubRepo && (
                  <Github className="w-3 h-3 text-zinc-600 shrink-0" />
                )}
                {project.liveUrl && (
                  <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusBg(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
                {project.stack && (
                  <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">
                    {project.stack}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-medium ${getPriorityColor(project.priority)}`}>
            {getPriorityLabel(project.priority)}
          </span>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 mb-4">
            {project.description}
          </p>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-zinc-500">Fortschritt</span>
            <span className="text-[11px] text-zinc-400 font-medium">{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${project.progress}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex -space-x-1.5">
              {project.members?.slice(0, 3).map((member) => (
                <div
                  key={member.user.id}
                  className="w-5 h-5 rounded-full bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-[9px] font-bold text-zinc-300"
                  title={member.user.name}
                >
                  {getInitials(member.user.name)}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-zinc-600">
              {project._count?.tasks ?? 0} Tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            {project.healthScore !== undefined && (
              <HealthScoreBadge score={project.healthScore} size="sm" />
            )}
            <span className="text-[11px] text-zinc-600">
              {format(new Date(project.updatedAt), "d. MMM", { locale: de })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
