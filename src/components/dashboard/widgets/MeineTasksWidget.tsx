import Link from "next/link";
import { User, Clock } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  project?: { name: string; color: string } | null;
}

interface MeineTasksWidgetProps {
  tasks: Task[];
  userName?: string;
}

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Bearbeitung",
  review: "Review",
  done: "Erledigt",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-blue-500/20 text-blue-400",
  review: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
};

export function MeineTasksWidget({ tasks, userName }: MeineTasksWidgetProps) {
  return (
    <WidgetShell
      title="Meine Tasks"
      icon={<User className="w-4 h-4 text-blue-400" />}
      href="/tasks"
    >
      <div className="divide-y divide-[#222]">
        {tasks.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            {userName ? `Keine Tasks für ${userName}` : "Keine zugewiesenen Tasks"}
          </div>
        ) : (
          tasks.slice(0, 5).map((task) => {
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href="/tasks"
                    className="text-sm text-white hover:text-emerald-400 transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[task.status] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    {task.project && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: task.project.color }}
                        />
                        {task.project.name}
                      </span>
                    )}
                  </div>
                </div>
                {task.dueDate && (
                  <div
                    className={`flex items-center gap-1 text-[11px] shrink-0 ${isOverdue ? "text-red-400" : "text-zinc-600"}`}
                  >
                    <Clock className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </WidgetShell>
  );
}
