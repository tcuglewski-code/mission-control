import Link from "next/link";
import { FolderKanban, ChevronRight } from "lucide-react";
import { getStatusBg, getStatusLabel, getPriorityLabel } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  priority: string;
  color: string;
  _count?: { tasks: number };
}

interface ActiveProjectsProps {
  projects: Project[];
}

export function ActiveProjects({ projects }: ActiveProjectsProps) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Aktive Projekte</h2>
        </div>
        <Link
          href="/projects"
          className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
        >
          Alle <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 text-zinc-600 text-sm">Keine aktiven Projekte</div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {project.name}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusBg(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: project.color,
                    }}
                  />
                </div>
                <span className="text-[11px] text-zinc-500 w-8 text-right">{project.progress}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">
                  {project._count?.tasks ?? 0} Tasks
                </span>
                <span className="text-[11px] text-zinc-600">
                  {getPriorityLabel(project.priority)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
