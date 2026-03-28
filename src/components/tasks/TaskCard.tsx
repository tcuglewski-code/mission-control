"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, AlertCircle, Play, Flag, Target, RefreshCw, Hash } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAppStore, type Task, type Label } from "@/store/useAppStore";
import { getRecurringLabel } from "@/lib/recurring";
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityDotColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
};

const priorityLabel: Record<string, string> = {
  critical: "🔴 Critical",
  high: "🔴 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { updateTaskStatus } = useAppStore();
  const [starting, setStarting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const isInProgress = task.status === "in_progress";

  // Subtask-Fortschritt
  const subtaskTotal = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
  const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  // Beschreibungs-Snippet (max. 80 Zeichen)
  const descSnippet = task.description
    ? task.description.replace(/[#*_`]/g, "").slice(0, 80) + (task.description.length > 80 ? "…" : "")
    : null;

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (starting || isInProgress) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/start`, { method: "POST" });
      if (res.ok) {
        const { task: updated } = await res.json();
        updateTaskStatus(task.id, updated.status);
      }
    } catch (err) {
      console.error("Failed to start task", err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "relative bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-3 cursor-pointer",
        "hover:border-[#3a3a3a] transition-colors group select-none",
        isDragging && "opacity-50 rotate-1 shadow-xl shadow-black/50 z-50"
      )}
    >
      {/* Hover-Vorschau Tooltip */}
      {descSnippet && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 hidden group-hover:block pointer-events-none">
          <div className="bg-[#111] border border-[#3a3a3a] rounded-lg px-3 py-2 shadow-xl">
            <p className="text-[11px] text-zinc-400 leading-relaxed">{descSnippet}</p>
          </div>
        </div>
      )}

      {/* Header: Priority dot + Title + Story Points + Recurring */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-1 shrink-0",
            priorityDotColors[task.priority] ?? "bg-zinc-500"
          )}
        />
        <p className="text-sm text-white leading-snug line-clamp-2 flex-1 group-hover:text-zinc-100">
          {task.title}
        </p>
        {/* Story Points Badge */}
        {task.storyPoints != null && task.storyPoints > 0 && (
          <div
            className="shrink-0 mt-0.5 flex items-center gap-0.5 bg-blue-500/15 border border-blue-500/25 text-blue-400 rounded px-1.5 py-0.5 text-[10px] font-bold"
            title={`${task.storyPoints} Story Points`}
          >
            <Hash className="w-2.5 h-2.5" />
            {task.storyPoints}
          </div>
        )}
        {task.recurring && task.recurringInterval && (
          <div
            className="shrink-0 mt-0.5"
            title={`Wiederkehrend — ${getRecurringLabel(task.recurringInterval, task.recurringDay)}`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 opacity-80" />
          </div>
        )}
      </div>

      {/* Priority label */}
      <div className="mb-1 ml-4">
        <span className="text-[10px] text-zinc-600">
          {priorityLabel[task.priority] ?? task.priority}
        </span>
      </div>

      {/* Project tag */}
      {task.project && (
        <div className="mb-1 ml-4">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${task.project.color}20`,
              color: task.project.color,
            }}
          >
            {task.project.name}
          </span>
        </div>
      )}

      {/* Sprint badge */}
      {task.sprint && (
        <div className="mb-2 ml-4">
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <Flag className="w-2.5 h-2.5" />
            {task.sprint.name}
          </span>
        </div>
      )}

      {/* Milestone badge */}
      {task.milestone && (
        <div className="mb-2 ml-4">
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${task.milestone.color}15`,
              color: task.milestone.color,
              border: `1px solid ${task.milestone.color}30`,
            }}
          >
            <Target className="w-2.5 h-2.5" />
            {task.milestone.title}
          </span>
        </div>
      )}

      {/* Label chips */}
      {task.taskLabels && task.taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 ml-4">
          {task.taskLabels.map(({ label }: { label: Label }) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${label.color}25`,
                color: label.color,
                border: `1px solid ${label.color}40`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Subtask-Fortschritts-Leiste */}
      {subtaskTotal > 0 && (
        <div className="ml-4 mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-zinc-600">Subtasks</span>
            <span className="text-[9px] text-zinc-600">{subtaskDone}/{subtaskTotal}</span>
          </div>
          <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${subtaskPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: DueDate + Assignee */}
      <div className="flex items-center justify-between ml-4">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                isOverdue ? "text-red-400 font-medium" : "text-zinc-500"
              )}
            >
              {isOverdue ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>
                {format(new Date(task.dueDate), "d. MMM", { locale: de })}
              </span>
              {isOverdue && (
                <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/25 rounded px-1">
                  überfällig
                </span>
              )}
            </div>
          )}
        </div>

        {task.assignee && (
          <div
            className="w-5 h-5 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[9px] font-bold text-zinc-300"
            title={task.assignee.name}
          >
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(task.assignee.name)
            )}
          </div>
        )}
      </div>

      {/* Start button or In-Progress badge */}
      <div className="flex items-center gap-1.5 mt-2 ml-4">
        {isInProgress ? (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            In Bearbeitung
          </span>
        ) : task.status !== "done" && task.status !== "review" ? (
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 bg-zinc-500/10 hover:bg-emerald-500/10 border border-zinc-600/20 hover:border-emerald-500/20 rounded px-1.5 py-0.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            {starting ? "..." : "Start"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
