"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Star, GripVertical, Clock, ArrowRight } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  project?: { name: string; color: string } | null;
}

interface MeineTasksWidgetProps {
  tasks: Task[];
  userName?: string;
}

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-blue-500/20 text-blue-400",
  review: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Bearbeitung",
  review: "Review",
  done: "Erledigt",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-zinc-600",
};

const todayStr = new Date().toISOString().split("T")[0];

export function MeineTasksWidget({ tasks: initialTasks, userName }: MeineTasksWidgetProps) {
  const [taskList, setTaskList] = useState<Task[]>(initialTasks.slice(0, 8));
  const [focusIds, setFocusIds] = useState<Set<string>>(new Set());
  const [focusLoading, setFocusLoading] = useState<string | null>(null);

  // ─── Drag-to-Reorder (HTML5 DnD) ─────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const handleDragStart = (i: number) => {
    dragIdx.current = i;
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    dragOverIdx.current = i;
  };

  const handleDrop = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return;
    if (dragIdx.current === dragOverIdx.current) return;
    const updated = [...taskList];
    const [moved] = updated.splice(dragIdx.current, 1);
    updated.splice(dragOverIdx.current, 0, moved);
    setTaskList(updated);
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  // ─── Fokus Toggle ──────────────────────────────────────────────────────────
  const toggleFocus = async (taskId: string) => {
    const isFocused = focusIds.has(taskId);
    if (!isFocused && focusIds.size >= 3) {
      alert("Maximal 3 Fokus-Tasks pro Tag erlaubt.");
      return;
    }
    setFocusLoading(taskId);
    try {
      const res = await fetch("/api/my-day/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date: todayStr, action: isFocused ? "remove" : "add" }),
      });
      if (res.ok) {
        setFocusIds((prev) => {
          const next = new Set(prev);
          if (isFocused) next.delete(taskId);
          else next.add(taskId);
          return next;
        });
      }
    } finally {
      setFocusLoading(null);
    }
  };

  return (
    <WidgetShell
      title="Meine Tasks"
      icon={
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      }
      href="/my-day"
    >
      {/* Header hint */}
      <div className="px-5 py-2 border-b border-[#1e1e1e] flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">
          ⭐ Fokus • ⠿ Ziehen zum Sortieren
        </p>
        <Link
          href="/my-day"
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors"
        >
          Mein Tag <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-[#222]">
        {taskList.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            {userName ? `Keine Tasks für ${userName}` : "Keine zugewiesenen Tasks"}
          </div>
        ) : (
          taskList.map((task, i) => {
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
            const isFocused = focusIds.has(task.id);

            return (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={handleDrop}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors group cursor-default select-none"
              >
                {/* Drag handle */}
                <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-700 group-hover:text-zinc-500 transition-colors">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Priority dot */}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-zinc-600"}`} />

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href="/tasks"
                    className="text-sm text-white hover:text-emerald-400 transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[task.status] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    {task.project && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: task.project.color }}
                        />
                        {task.project.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Due date */}
                {task.dueDate && (
                  <div
                    className={`flex items-center gap-1 text-[10px] shrink-0 ${isOverdue ? "text-red-400" : "text-zinc-600"}`}
                  >
                    <Clock className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                )}

                {/* Fokus Toggle */}
                <button
                  onClick={() => toggleFocus(task.id)}
                  disabled={focusLoading === task.id}
                  className={`shrink-0 transition-colors ${
                    isFocused
                      ? "text-orange-400"
                      : "text-zinc-700 hover:text-orange-400 opacity-0 group-hover:opacity-100"
                  }`}
                  title={isFocused ? "Aus Fokus entfernen" : "Als heute fokussieren"}
                >
                  <Star className={`w-3.5 h-3.5 ${isFocused ? "fill-orange-400" : ""}`} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {initialTasks.length > 8 && (
        <div className="px-5 py-2 border-t border-[#1e1e1e]">
          <Link href="/tasks" className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            +{initialTasks.length - 8} weitere Tasks anzeigen →
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
