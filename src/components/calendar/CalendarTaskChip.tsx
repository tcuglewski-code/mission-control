"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/store/useAppStore";

interface CalendarTaskChipProps {
  task: Task;
  onClick: (task: Task) => void;
  compact?: boolean;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  high: {
    bg: "bg-red-500/15 hover:bg-red-500/25",
    text: "text-red-300",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
  medium: {
    bg: "bg-yellow-500/15 hover:bg-yellow-500/25",
    text: "text-yellow-300",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  low: {
    bg: "bg-green-500/15 hover:bg-green-500/25",
    text: "text-green-300",
    border: "border-green-500/30",
    dot: "bg-green-400",
  },
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Zu erledigen",
  in_progress: "In Bearbeitung",
  review: "Review",
  done: "Erledigt",
};

export function CalendarTaskChip({ task, onClick, compact = false }: CalendarTaskChipProps) {
  const styles = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;

  return (
    <button
      onClick={() => onClick(task)}
      className={cn(
        "w-full text-left px-1.5 py-0.5 rounded border text-[11px] leading-tight truncate transition-colors cursor-pointer",
        styles.bg,
        styles.text,
        styles.border
      )}
      title={`${task.title} — ${STATUS_LABELS[task.status] ?? task.status}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", styles.dot)} />
        <span className="truncate font-medium">{task.title}</span>
      </div>
    </button>
  );
}
