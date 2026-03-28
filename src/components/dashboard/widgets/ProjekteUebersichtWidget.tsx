import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { getStatusBg, getStatusLabel } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  color: string;
  _count?: { tasks: number };
}

interface ProjekteUebersichtWidgetProps {
  projects: Project[];
}

export function ProjekteUebersichtWidget({ projects }: ProjekteUebersichtWidgetProps) {
  return (
    <WidgetShell
      title="Projekte-Übersicht"
      icon={<FolderKanban className="w-4 h-4 text-emerald-400" />}
      href="/projects"
    >
      <div className="divide-y divide-[#222]">
        {projects.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Keine aktiven Projekte
          </div>
        ) : (
          projects.slice(0, 5).map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors group"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                  {project.name}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: project.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 w-8 text-right shrink-0">
                    {project.progress}%
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${getStatusBg(project.status)}`}
              >
                {getStatusLabel(project.status)}
              </span>
            </Link>
          ))
        )}
      </div>
    </WidgetShell>
  );
}
