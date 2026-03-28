"use client";

import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Task } from "@/store/useAppStore";
import { CalendarTaskChip } from "./CalendarTaskChip";

interface CalendarWeekProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarWeek({ currentDate, tasks, onTaskClick }: CalendarWeekProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getTasksForDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return isSameDay(new Date(t.dueDate), day);
    });
  }

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  return (
    <div className="flex-1 flex flex-col bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-3 text-center border-r border-[#2a2a2a] last:border-r-0",
                today && "bg-emerald-500/5"
              )}
            >
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">
                {format(day, "EEE", { locale: de })}
              </div>
              <div
                className={cn(
                  "text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full",
                  today ? "bg-emerald-500 text-white" : "text-white"
                )}
              >
                {format(day, "d")}
              </div>
              {/* Date label */}
              <div className="text-[10px] text-zinc-600 mt-0.5">
                {format(day, "MMM", { locale: de })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tasks per day */}
      <div className="grid grid-cols-7 flex-1 min-h-[400px]">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day)
            .slice()
            .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 border-r border-[#2a2a2a] last:border-r-0 space-y-1.5 overflow-y-auto",
                today && "bg-emerald-500/3"
              )}
            >
              {dayTasks.length === 0 ? (
                today ? (
                  <p className="text-[11px] text-zinc-700 text-center mt-4">Keine Aufgaben</p>
                ) : null
              ) : (
                dayTasks.map((task) => (
                  <CalendarTaskChip key={task.id} task={task} onClick={onTaskClick} />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2a2a2a] bg-[#161616]">
        <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide mr-2">Priorität:</span>
        {[
          { label: "Hoch", dot: "bg-red-400" },
          { label: "Mittel", dot: "bg-yellow-400" },
          { label: "Niedrig", dot: "bg-green-400" },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", dot)} />
            <span className="text-[11px] text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
