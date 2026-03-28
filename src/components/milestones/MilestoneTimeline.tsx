"use client";

import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, XCircle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Milestone } from "./MilestoneCard";

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onSelect?: (milestone: Milestone) => void;
}

const statusIcons: Record<string, typeof Circle> = {
  planned: Circle,
  active: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  planned: "text-zinc-400 border-zinc-500",
  active: "text-blue-400 border-blue-500",
  completed: "text-emerald-400 border-emerald-500",
  cancelled: "text-red-400 border-red-500",
};

export function MilestoneTimeline({ milestones, onSelect }: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Timeline</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-zinc-500">Keine Meilensteine mit Datum</p>
        </div>
      </div>
    );
  }

  const sortedMilestones = [...milestones]
    .filter((m) => m.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const today = new Date();
  const nextMilestone = sortedMilestones.find(
    (m) => m.status !== "completed" && m.status !== "cancelled" && isAfter(new Date(m.dueDate!), today)
  );

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Flag className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">Timeline</h2>
        {nextMilestone && (
          <span className="ml-auto text-[11px] text-zinc-500">
            Nächster: <span className="text-zinc-300">{nextMilestone.title}</span> in{" "}
            {differenceInDays(new Date(nextMilestone.dueDate!), today)} Tagen
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2a2a2a]" />

        <div className="space-y-4">
          {sortedMilestones.map((milestone, index) => {
            const Icon = statusIcons[milestone.status] ?? Circle;
            const colorClass = statusColors[milestone.status] ?? statusColors.planned;
            const dueDate = new Date(milestone.dueDate!);
            const isPast = isBefore(dueDate, today);
            const isOverdue = isPast && milestone.status !== "completed" && milestone.status !== "cancelled";
            const progress = milestone.calculatedProgress ?? milestone.progress;

            return (
              <div
                key={milestone.id}
                className={cn(
                  "relative pl-10 py-2 cursor-pointer group",
                  onSelect && "hover:bg-[#252525]/50 -mx-2 px-12 rounded-lg transition-colors"
                )}
                onClick={() => onSelect?.(milestone)}
              >
                <div
                  className={cn(
                    "absolute left-2 w-5 h-5 rounded-full bg-[#1c1c1c] border-2 flex items-center justify-center transition-colors",
                    colorClass,
                    isOverdue && "border-red-500 text-red-400"
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: milestone.color }}
                      />
                      <h4 className="text-sm font-medium text-white truncate group-hover:text-zinc-100">
                        {milestone.title}
                      </h4>
                    </div>
                    {milestone.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{milestone.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={cn("text-[11px]", isOverdue ? "text-red-400" : "text-zinc-500")}>
                        {format(dueDate, "d. MMMM yyyy", { locale: de })}
                        {isOverdue && " (überfällig)"}
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        {milestone.taskStats?.done ?? 0}/{milestone.taskStats?.total ?? 0} Tasks
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 w-20">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-zinc-600">{progress}%</span>
                    </div>
                    <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: milestone.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
