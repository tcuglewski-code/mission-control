import Link from "next/link";
import { Milestone, CalendarDays } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface MilestoneItem {
  id: string;
  title: string;
  status: string;
  progress: number;
  color: string;
  dueDate?: Date | null;
  project: { name: string };
}

interface MeilensteinWidgetProps {
  milestones: MilestoneItem[];
}

const STATUS_COLOR: Record<string, string> = {
  planned: "bg-zinc-700 text-zinc-300",
  active: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

export function MeilensteinWidget({ milestones }: MeilensteinWidgetProps) {
  return (
    <WidgetShell
      title="Meilensteine"
      icon={<Milestone className="w-4 h-4 text-yellow-400" />}
      href="/projects"
    >
      <div className="divide-y divide-[#222]">
        {milestones.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Keine anstehenden Meilensteine
          </div>
        ) : (
          milestones.slice(0, 5).map((ms) => {
            const isOverdue =
              ms.dueDate &&
              new Date(ms.dueDate) < new Date() &&
              ms.status !== "completed";
            return (
              <div
                key={ms.id}
                className="px-5 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: ms.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{ms.title}</p>
                    <p className="text-[11px] text-zinc-500">{ms.project.name}</p>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_COLOR[ms.status] ?? "bg-zinc-700 text-zinc-300"}`}
                  >
                    {STATUS_LABEL[ms.status] ?? ms.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${ms.progress}%`, backgroundColor: ms.color }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 w-8 text-right">
                    {ms.progress}%
                  </span>
                  {ms.dueDate && (
                    <span
                      className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-400" : "text-zinc-600"}`}
                    >
                      <CalendarDays className="w-3 h-3" />
                      {new Date(ms.dueDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </WidgetShell>
  );
}
