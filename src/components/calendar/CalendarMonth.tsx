"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Task } from "@/store/useAppStore";
import { CalendarTaskChip } from "./CalendarTaskChip";

interface CalendarMonthProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarMonth({ currentDate, tasks, onTaskClick }: CalendarMonthProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function getTasksForDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return isSameDay(new Date(t.dueDate), day);
    });
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wide border-r border-[#2a2a2a] last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(80px, 1fr)" }}>
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const MAX_VISIBLE = 3;
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE);
          const remaining = dayTasks.length - MAX_VISIBLE;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-b border-[#2a2a2a] last-in-row:border-r-0 p-1.5 flex flex-col min-h-[80px]",
                !isCurrentMonth && "opacity-40",
                today && "bg-emerald-500/5"
              )}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span
                  className={cn(
                    "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                    today
                      ? "bg-emerald-500 text-white"
                      : isCurrentMonth
                      ? "text-zinc-300"
                      : "text-zinc-600"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-0.5 flex-1">
                {visibleTasks.map((task) => (
                  <CalendarTaskChip key={task.id} task={task} onClick={onTaskClick} />
                ))}
                {remaining > 0 && (
                  <span className="text-[10px] text-zinc-500 px-1">
                    +{remaining} weitere
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
