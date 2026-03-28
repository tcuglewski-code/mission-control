"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/store/useAppStore";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  wipLimit?: number | null;
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  wipLimit,
  onAddTask,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isWipExceeded = wipLimit != null && tasks.length > wipLimit;
  const isWipWarning = wipLimit != null && tasks.length === wipLimit;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
            {title}
          </span>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isWipExceeded
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isWipWarning
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "text-zinc-600 bg-[#252525]"
            )}
          >
            {tasks.length}
            {wipLimit != null && (
              <span className="text-zinc-600">/{wipLimit}</span>
            )}
          </span>
          {isWipExceeded && (
            <AlertTriangle
              className="w-3.5 h-3.5 text-red-400"
              title={`WIP-Limit überschritten! Max. ${wipLimit} Tasks`}
            />
          )}
        </div>
        <button
          onClick={onAddTask}
          className="text-zinc-600 hover:text-zinc-300 p-1 rounded hover:bg-[#252525] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* WIP-Limit Indikator-Leiste */}
      {wipLimit != null && (
        <div className="mb-2 px-1">
          <div className="h-0.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isWipExceeded ? "bg-red-500" : isWipWarning ? "bg-yellow-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min((tasks.length / wipLimit) * 100, 100)}%` }}
            />
          </div>
          <p className={cn(
            "text-[9px] mt-0.5",
            isWipExceeded ? "text-red-400" : "text-zinc-700"
          )}>
            {isWipExceeded
              ? `⚠ WIP-Limit überschritten (max. ${wipLimit})`
              : `WIP-Limit: ${tasks.length}/${wipLimit}`}
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-2 rounded-lg min-h-[200px] transition-colors",
          isOver ? "bg-[#1e1e1e] border border-dashed border-[#3a3a3a]" : "bg-transparent"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center h-20 text-xs text-zinc-700 border border-dashed border-[#2a2a2a] rounded-lg cursor-pointer hover:border-[#3a3a3a] transition-colors"
            onClick={onAddTask}
          >
            + Task hinzufügen
          </div>
        )}
      </div>
    </div>
  );
}
