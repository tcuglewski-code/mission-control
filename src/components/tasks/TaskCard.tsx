"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, AlertCircle, Play, Square, Clock } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAppStore, type Task } from "@/store/useAppStore";
import { useState, useEffect, useRef, useCallback } from "react";

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

// LocalStorage key for active timers: { [taskId]: startTimestamp }
const LS_KEY = "mc_timers";

function getStoredTimers(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setStoredTimer(taskId: string, startedAt: number | null) {
  const timers = getStoredTimers();
  if (startedAt === null) {
    delete timers[taskId];
  } else {
    timers[taskId] = startedAt;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(timers));
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerButton({ task, onCardClick }: { task: Task; onCardClick?: () => void }) {
  const { updateTaskTime } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds since timer started
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: check localStorage for a running timer
  useEffect(() => {
    const timers = getStoredTimers();
    const storedStart = timers[task.id];
    if (storedStart) {
      startRef.current = storedStart;
      setIsRunning(true);
      const elapsedSecs = Math.floor((Date.now() - storedStart) / 1000);
      setElapsed(elapsedSecs);
    }
  }, [task.id]);

  // Tick interval when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    startRef.current = now;
    setStoredTimer(task.id, now);
    setElapsed(0);
    setIsRunning(true);
  }, [task.id]);

  const handleStop = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!startRef.current) return;

    const sessionSecs = Math.floor((Date.now() - startRef.current) / 1000);
    const totalSecs = (task.timeSpentSeconds ?? 0) + sessionSecs;

    // Optimistic update
    updateTaskTime(task.id, totalSecs);

    setIsRunning(false);
    setElapsed(0);
    startRef.current = null;
    setStoredTimer(task.id, null);

    // Persist to API
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpentSeconds: totalSecs }),
      });
    } catch (e) {
      console.error("Failed to save time", e);
    }
  }, [task.id, task.timeSpentSeconds, updateTaskTime]);

  const totalDisplay = task.timeSpentSeconds ? formatDuration(task.timeSpentSeconds) : null;

  return (
    <div className="flex items-center gap-1.5 mt-2 ml-4">
      {isRunning ? (
        <>
          <button
            onClick={handleStop}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded px-1.5 py-0.5 transition-colors"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            Stop
          </button>
          <span className="text-[10px] font-mono text-orange-400 tabular-nums">
            {formatDuration(elapsed)}
          </span>
        </>
      ) : (
        <>
          <button
            onClick={handleStart}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 bg-zinc-500/10 hover:bg-emerald-500/10 border border-zinc-600/20 hover:border-emerald-500/20 rounded px-1.5 py-0.5 transition-colors"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            Start
          </button>
          {totalDisplay && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-600 tabular-nums">
              <Clock className="w-2.5 h-2.5" />
              {totalDisplay}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function TaskCard({ task, onClick }: TaskCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-3 cursor-pointer",
        "hover:border-[#3a3a3a] transition-colors group select-none",
        isDragging && "opacity-50 rotate-1 shadow-xl shadow-black/50 z-50"
      )}
    >
      {/* Header: Priority dot + Title */}
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
      </div>

      {/* Priority label */}
      <div className="mb-1 ml-4">
        <span className="text-[10px] text-zinc-600">
          {priorityLabel[task.priority] ?? task.priority}
        </span>
      </div>

      {/* Project tag */}
      {task.project && (
        <div className="mb-2 ml-4">
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

      {/* Footer: DueDate + Assignee */}
      <div className="flex items-center justify-between ml-4">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                isOverdue ? "text-red-400" : "text-zinc-500"
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

      {/* Timer */}
      <TimerButton task={task} onCardClick={onClick} />
    </div>
  );
}
