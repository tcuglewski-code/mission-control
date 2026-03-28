"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, CheckCircle2, Circle, Clock, XCircle, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  progress: number;
  calculatedProgress?: number;
  color: string;
  dueDate?: string | null;
  projectId: string;
  project?: { id: string; name: string; color: string };
  taskStats?: { total: number; done: number };
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

interface MilestoneCardProps {
  milestone: Milestone;
  onEdit?: (milestone: Milestone) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  planned: { label: "Geplant", icon: Circle, color: "text-zinc-400", bg: "bg-zinc-500/15 border-zinc-500/20" },
  active: { label: "Aktiv", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/20" },
  completed: { label: "Abgeschlossen", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  cancelled: { label: "Abgebrochen", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
};

export function MilestoneCard({ milestone, onEdit, onDelete, compact = false }: MilestoneCardProps) {
  const status = statusConfig[milestone.status] ?? statusConfig.planned;
  const StatusIcon = status.icon;
  const progress = milestone.calculatedProgress ?? milestone.progress;
  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < new Date() && milestone.status !== "completed";
  const taskCount = milestone.taskStats?.total ?? milestone._count?.tasks ?? 0;
  const doneCount = milestone.taskStats?.done ?? 0;

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors cursor-pointer"
        onClick={() => onEdit?.(milestone)}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: milestone.color }}
        />
        <span className="text-sm text-white flex-1 truncate">{milestone.title}</span>
        <span className={cn("text-[11px]", status.color)}>{status.label}</span>
        {milestone.dueDate && (
          <span className={cn("text-[11px]", isOverdue ? "text-red-400" : "text-zinc-500")}>
            {format(new Date(milestone.dueDate), "d. MMM", { locale: de })}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{
              backgroundColor: `${milestone.color}20`,
              color: milestone.color,
              border: `1px solid ${milestone.color}30`,
            }}
          >
            {milestone.title[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{milestone.title}</h3>
            {milestone.description && (
              <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{milestone.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(milestone)}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(milestone.id)}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium", status.bg, status.color)}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
        {milestone.dueDate && (
          <span className={cn("inline-flex items-center gap-1 text-[11px]", isOverdue ? "text-red-400" : "text-zinc-500")}>
            <Calendar className="w-3 h-3" />
            {format(new Date(milestone.dueDate), "d. MMMM yyyy", { locale: de })}
            {isOverdue && " (überfällig)"}
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-zinc-500">Fortschritt</span>
          <span className="text-[11px] text-zinc-300 font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: milestone.color }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-600">
        <span>{doneCount} von {taskCount} Tasks erledigt</span>
        {milestone.project && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: `${milestone.project.color}20`,
              color: milestone.project.color,
            }}
          >
            {milestone.project.name}
          </span>
        )}
      </div>
    </div>
  );
}
