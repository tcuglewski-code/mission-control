"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar, AlertCircle, Play, Flag, Target, RefreshCw, Hash, ShieldAlert, Zap, Check,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAppStore, type Task, type Label } from "@/store/useAppStore";
import { getRecurringLabel } from "@/lib/recurring";
import { useState, useRef, useCallback } from "react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onQuickEdit?: (task: Task) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  // Inline-Edit Callbacks
  onInlineSave?: (id: string, data: Partial<Task>) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
  todo: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  in_progress: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  in_review: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  done: "bg-zinc-600/20 text-zinc-500 border-zinc-600/25",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Bearbeitung",
  in_review: "In Prüfung",
  done: "Erledigt",
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "🔴 Critical",
  high: "🔴 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "in_review", label: "In Prüfung" },
  { value: "done", label: "Erledigt" },
];

export function TaskCard({
  task,
  onClick,
  onQuickEdit,
  selected = false,
  onSelect,
  onInlineSave,
}: TaskCardProps) {
  const { updateTaskStatus, tasks, setTasks } = useAppStore();
  const [starting, setStarting] = useState(false);

  // Inline-Editing States
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDate, setEditingDate] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: editingTitle || editingDate || statusDropdownOpen,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const isInProgress = task.status === "in_progress";
  const isBlocked = task.isBlocked === true;

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

  // ── Inline-Title-Editing ──────────────────────────────────────────────────

  const startTitleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleValue(task.title);
    setEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  }, [task.title]);

  const saveTitleEdit = useCallback(async () => {
    const newTitle = titleValue.trim();
    if (!newTitle || newTitle === task.title) {
      setEditingTitle(false);
      setTitleValue(task.title);
      return;
    }
    // Optimistisches Update
    const prev = tasks.find((t) => t.id === task.id);
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, title: newTitle } : t));
    setEditingTitle(false);
    try {
      if (onInlineSave) {
        await onInlineSave(task.id, { title: newTitle });
      } else {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (!res.ok) throw new Error("Failed");
      }
    } catch {
      // Rollback
      if (prev) setTasks(tasks.map((t) => t.id === task.id ? prev : t));
      setTitleValue(task.title);
    }
  }, [titleValue, task.id, task.title, tasks, setTasks, onInlineSave]);

  const cancelTitleEdit = useCallback(() => {
    setEditingTitle(false);
    setTitleValue(task.title);
  }, [task.title]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); saveTitleEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelTitleEdit(); }
  };

  // ── Inline-Date-Editing ───────────────────────────────────────────────────

  const startDateEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDate(true);
    setTimeout(() => {
      dateInputRef.current?.focus();
      dateInputRef.current?.showPicker?.();
    }, 50);
  }, []);

  const saveDateEdit = useCallback(async (value: string) => {
    setEditingDate(false);
    const newDate = value ? new Date(value) : null;
    const prev = tasks.find((t) => t.id === task.id);
    // Optimistisches Update
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, dueDate: newDate } : t));
    try {
      if (onInlineSave) {
        await onInlineSave(task.id, { dueDate: newDate });
      } else {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: newDate }),
        });
        if (!res.ok) throw new Error("Failed");
      }
    } catch {
      if (prev) setTasks(tasks.map((t) => t.id === task.id ? prev : t));
    }
  }, [task.id, tasks, setTasks, onInlineSave]);

  // ── Status-Dropdown ───────────────────────────────────────────────────────

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setStatusDropdownOpen(false);
    if (newStatus === task.status) return;
    // Optimistisches Update
    updateTaskStatus(task.id, newStatus);
    try {
      if (onInlineSave) {
        await onInlineSave(task.id, { status: newStatus });
      } else {
        await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch {
      // Rollback bei Fehler
      updateTaskStatus(task.id, task.status);
    }
  }, [task.id, task.status, updateTaskStatus, onInlineSave]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editingTitle || editingDate || statusDropdownOpen ? {} : listeners)}
      onClick={editingTitle || editingDate || statusDropdownOpen ? undefined : onClick}
      className={cn(
        "relative bg-[#1c1c1c] border rounded-lg p-3 cursor-pointer",
        "hover:border-[#3a3a3a] transition-colors group select-none",
        isBlocked
          ? "border-red-500/40 bg-red-950/10"
          : selected
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-[#2a2a2a]",
        isDragging && "opacity-50 rotate-1 shadow-xl shadow-black/50 z-50"
      )}
    >
      {/* Hover-Vorschau Tooltip */}
      {descSnippet && !editingTitle && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 hidden group-hover:block pointer-events-none">
          <div className="bg-[#111] border border-[#3a3a3a] rounded-lg px-3 py-2 shadow-xl">
            <p className="text-[11px] text-zinc-400 leading-relaxed">{descSnippet}</p>
          </div>
        </div>
      )}

      {/* Checkbox (Hover oder selected) */}
      {onSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task.id, !selected);
          }}
          className={cn(
            "absolute top-2 left-2 w-4 h-4 rounded border transition-all z-10",
            "opacity-0 group-hover:opacity-100",
            selected
              ? "opacity-100 bg-emerald-600 border-emerald-500"
              : "bg-[#252525] border-[#3a3a3a] hover:border-emerald-500/50"
          )}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white m-auto" />}
        </button>
      )}

      {/* Quick-Edit Button (Hover) */}
      {onQuickEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickEdit(task);
          }}
          className={cn(
            "absolute top-2 right-2 z-10",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
            "bg-yellow-500/15 border border-yellow-500/25 text-yellow-400",
            "hover:bg-yellow-500/25 hover:border-yellow-500/40"
          )}
        >
          <Zap className="w-2.5 h-2.5" />
          Bearbeiten
        </button>
      )}

      {/* Blocker-Banner */}
      {isBlocked && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
          <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-[10px] text-red-400 font-medium">Blockiert</span>
        </div>
      )}

      {/* Header: Priority dot + Title (inline editable) */}
      <div className="flex items-start gap-2 mb-2" style={{ paddingTop: onSelect || onQuickEdit ? "0" : "0" }}>
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-1 shrink-0",
            PRIORITY_DOT_COLORS[task.priority] ?? "bg-zinc-500"
          )}
        />
        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={saveTitleEdit}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[#252525] border border-emerald-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        ) : (
          <p
            className="text-sm text-white leading-snug line-clamp-2 flex-1 group-hover:text-zinc-100"
            onDoubleClick={startTitleEdit}
            title="Doppelklick zum Bearbeiten"
          >
            {task.title}
          </p>
        )}
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

      {/* Status-Badge (klickbar → Dropdown) */}
      <div className="relative mb-1 ml-4 inline-block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownOpen((v) => !v);
          }}
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
            STATUS_COLORS[task.status] ?? "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
            "hover:opacity-80"
          )}
        >
          {STATUS_LABELS[task.status] ?? task.status}
        </button>
        {statusDropdownOpen && (
          <div
            className="absolute top-full left-0 mt-1 z-30 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={cn(
                  "w-full px-3 py-2 text-xs text-left hover:bg-[#252525] transition-colors flex items-center gap-2",
                  task.status === opt.value ? "text-emerald-400" : "text-zinc-300"
                )}
              >
                {task.status === opt.value && <Check className="w-3 h-3 shrink-0" />}
                {task.status !== opt.value && <span className="w-3 shrink-0" />}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority label */}
      <div className="mb-1 ml-4">
        <span className="text-[10px] text-zinc-600">
          {PRIORITY_LABEL[task.priority] ?? task.priority}
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

      {/* Footer: DueDate (inline editable) + Assignee */}
      <div className="flex items-center justify-between ml-4">
        <div className="flex items-center gap-2">
          {editingDate ? (
            <input
              ref={dateInputRef}
              type="date"
              defaultValue={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
              onChange={(e) => saveDateEdit(e.target.value)}
              onBlur={() => setEditingDate(false)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#252525] border border-emerald-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
            />
          ) : task.dueDate ? (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] cursor-pointer rounded px-1 py-0.5 hover:bg-[#252525] transition-colors",
                isOverdue ? "text-red-400 font-medium" : "text-zinc-500"
              )}
              onClick={(e) => {
                e.stopPropagation();
                startDateEdit(e);
              }}
              title="Klicken zum Bearbeiten"
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
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startDateEdit(e);
              }}
              className="flex items-center gap-1 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors rounded px-1 py-0.5 hover:bg-[#252525]"
              title="Fälligkeitsdatum setzen"
            >
              <Calendar className="w-3 h-3" />
              <span className="opacity-0 group-hover:opacity-100">Datum</span>
            </button>
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
