import Link from "next/link";
import { CheckSquare, Clock, AlertCircle, Circle } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  project?: { name: string; color: string } | null;
}

interface OffeneTasksWidgetProps {
  tasks: Task[];
  totalCount: number;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-zinc-500",
};

const STATUS_ICON: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
};

export function OffeneTasksWidget({ tasks, totalCount }: OffeneTasksWidgetProps) {
  return (
    <WidgetShell
      title="Offene Tasks"
      icon={<CheckSquare className="w-4 h-4 text-orange-400" />}
      href="/tasks"
    >
      <div className="divide-y divide-[#222]">
        {tasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Keine offenen Tasks 🎉
          </div>
        ) : (
          tasks.slice(0, 5).map((task) => {
            const StatusIcon = STATUS_ICON[task.status] ?? Circle;
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <StatusIcon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href="/tasks"
                    className="text-sm text-white hover:text-emerald-400 transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.project && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: task.project.color }}
                        />
                        {task.project.name}
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        className={`text-[11px] ${isOverdue ? "text-red-400" : "text-zinc-600"}`}
                      >
                        {isOverdue ? "⚠ " : ""}
                        {new Date(task.dueDate).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium shrink-0 ${PRIORITY_COLOR[task.priority] ?? "text-zinc-500"}`}
                >
                  {task.priority === "urgent"
                    ? "Dringend"
                    : task.priority === "high"
                    ? "Hoch"
                    : task.priority === "medium"
                    ? "Mittel"
                    : "Niedrig"}
                </span>
              </div>
            );
          })
        )}
      </div>
      {totalCount > 5 && (
        <div className="px-5 py-3 border-t border-[#222]">
          <Link
            href="/tasks"
            className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            + {totalCount - 5} weitere Tasks anzeigen
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
