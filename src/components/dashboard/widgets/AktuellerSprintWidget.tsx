"use client";

import { useState, useEffect } from "react";
import { Flag, Clock, CheckCircle2, TrendingUp, ArrowRight, Play, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { WidgetShell } from "./WidgetShell";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  status: string;
  storyPoints: number | null;
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  storyPoints: number | null;
  completedPoints: number | null;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  tasks: Task[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "Planung", color: "text-blue-400", bg: "bg-blue-500/10" },
  active: { label: "Aktiv", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  completed: { label: "Abgeschlossen", color: "text-zinc-400", bg: "bg-zinc-500/10" },
};

export function AktuellerSprintWidget() {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sprints?status=active")
      .then((res) => res.json())
      .then((data) => {
        // Ersten aktiven Sprint nehmen
        if (Array.isArray(data) && data.length > 0) {
          setSprint(data[0]);
        } else {
          // Fallback: nächsten geplanten Sprint
          fetch("/api/sprints?status=planning")
            .then((res) => res.json())
            .then((planningData) => {
              if (Array.isArray(planningData) && planningData.length > 0) {
                setSprint(planningData[0]);
              }
            });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <WidgetShell title="Aktueller Sprint" icon={<Flag className="w-4 h-4" />}>
        <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
          Lade...
        </div>
      </WidgetShell>
    );
  }

  if (!sprint) {
    return (
      <WidgetShell title="Aktueller Sprint" icon={<Flag className="w-4 h-4" />}>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Flag className="w-8 h-8 text-zinc-700 mb-2" />
          <p className="text-zinc-500 text-sm">Kein aktiver Sprint</p>
          <Link
            href="/sprints"
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Sprint erstellen
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </WidgetShell>
    );
  }

  const totalTasks = sprint.tasks.length;
  const doneTasks = sprint.tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = sprint.tasks.filter((t) => t.status === "in_progress").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalSP = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const doneSP = sprint.tasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  const daysRemaining = sprint.endDate
    ? differenceInDays(new Date(sprint.endDate), new Date())
    : null;

  const statusCfg = STATUS_LABELS[sprint.status] ?? STATUS_LABELS.planning;

  return (
    <WidgetShell
      title="Aktueller Sprint"
      icon={<Flag className="w-4 h-4" />}
      action={
        <Link
          href="/sprints"
          className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
        >
          Alle Sprints
          <ArrowRight className="w-3 h-3" />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Sprint Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white truncate">{sprint.name}</h3>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusCfg.color, statusCfg.bg)}>
                {statusCfg.label}
              </span>
            </div>
            {sprint.goal && (
              <p className="text-xs text-zinc-400 line-clamp-1 flex items-center gap-1">
                <Target className="w-3 h-3 shrink-0" />
                {sprint.goal}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-zinc-500">Fortschritt</span>
            <span className="text-xs text-white font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-sm font-bold text-white">{doneTasks}/{totalTasks}</span>
            </div>
            <span className="text-[10px] text-zinc-500">Tasks erledigt</span>
          </div>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span className="text-sm font-bold text-white">{doneSP}/{totalSP}</span>
            </div>
            <span className="text-[10px] text-zinc-500">Story Points</span>
          </div>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className={cn(
                "text-sm font-bold",
                daysRemaining !== null && daysRemaining < 3 ? "text-red-400" : "text-white"
              )}>
                {daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : "—"}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Tage übrig</span>
          </div>
        </div>

        {/* In Progress Tasks */}
        {inProgressTasks > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Play className="w-3 h-3 text-orange-400 fill-orange-400" />
            <span>{inProgressTasks} Task{inProgressTasks !== 1 ? "s" : ""} in Bearbeitung</span>
          </div>
        )}

        {/* Sprint Dates */}
        {sprint.startDate && sprint.endDate && (
          <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-[#2a2a2a]">
            <span>
              {format(new Date(sprint.startDate), "d. MMM", { locale: de })} – {format(new Date(sprint.endDate), "d. MMM yyyy", { locale: de })}
            </span>
            {sprint.project && (
              <Link
                href={`/projects/${sprint.project.id}`}
                className="flex items-center gap-1 hover:text-zinc-400"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sprint.project.color }}
                />
                {sprint.project.name}
              </Link>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
