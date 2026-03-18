"use client";

import { useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Event } from "@/store/useAppStore";

interface CalendarViewProps {
  events: Event[];
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  task: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  meeting: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  cron: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  deployment: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
  reminder: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
  default: { bg: "bg-zinc-700/20", text: "text-zinc-300", border: "border-zinc-600/30" },
};

// Static sprint schedule
interface SprintBlock {
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  color: string;
}

const SPRINT_BLOCKS: SprintBlock[] = [
  { label: "Sprint 0.1", start: "2026-04-01", end: "2026-04-07", color: "#6b7280" },
  { label: "Sprint 0.2", start: "2026-04-08", end: "2026-04-14", color: "#6b7280" },
  { label: "Sprint 0.3", start: "2026-04-15", end: "2026-04-21", color: "#6b7280" },
  { label: "Sprint 1.1", start: "2026-04-22", end: "2026-04-28", color: "#10b981" },
  { label: "Sprint 1.2", start: "2026-04-29", end: "2026-05-05", color: "#10b981" },
  { label: "Sprint 1.3", start: "2026-05-06", end: "2026-05-12", color: "#10b981" },
  { label: "Sprint 1.4", start: "2026-05-13", end: "2026-05-19", color: "#10b981" },
  { label: "Sprint 1.5", start: "2026-05-20", end: "2026-05-26", color: "#10b981" },
  { label: "Test 1",     start: "2026-05-27", end: "2026-06-02", color: "#ef4444" },
  { label: "Sprint 2.1", start: "2026-06-03", end: "2026-06-09", color: "#3b82f6" },
  { label: "Sprint 2.2", start: "2026-06-10", end: "2026-06-16", color: "#3b82f6" },
  { label: "Sprint 2.3", start: "2026-06-17", end: "2026-06-23", color: "#3b82f6" },
  { label: "Sprint 2.4", start: "2026-06-24", end: "2026-06-30", color: "#3b82f6" },
  { label: "Sprint 2.5", start: "2026-07-01", end: "2026-07-07", color: "#3b82f6" },
  { label: "Test 2",     start: "2026-07-08", end: "2026-07-14", color: "#ef4444" },
  { label: "Sprint 3.1", start: "2026-07-15", end: "2026-07-21", color: "#8b5cf6" },
  { label: "Sprint 3.2", start: "2026-07-22", end: "2026-07-28", color: "#8b5cf6" },
  { label: "Sprint 3.3", start: "2026-07-29", end: "2026-08-04", color: "#8b5cf6" },
  { label: "Sprint 3.4", start: "2026-08-05", end: "2026-08-11", color: "#8b5cf6" },
  { label: "Sprint 3.5", start: "2026-08-12", end: "2026-08-18", color: "#8b5cf6" },
  { label: "Test 3",     start: "2026-08-19", end: "2026-08-25", color: "#ef4444" },
  { label: "Sprint 4.1", start: "2026-08-26", end: "2026-09-01", color: "#f59e0b" },
  { label: "Sprint 4.2", start: "2026-09-02", end: "2026-09-08", color: "#f59e0b" },
  { label: "Sprint 4.3", start: "2026-09-09", end: "2026-09-15", color: "#f59e0b" },
  { label: "Sprint 4.4", start: "2026-09-16", end: "2026-09-22", color: "#f59e0b" },
  { label: "🚀 Launch",  start: "2026-09-23", end: "2026-09-23", color: "#ef4444" },
];

function getSprintBlocksForDay(day: Date): SprintBlock[] {
  return SPRINT_BLOCKS.filter((block) => {
    const start = parseISO(block.start);
    const end = parseISO(block.end);
    return isWithinInterval(day, { start, end });
  });
}

function getSprintBlocksForWeek(days: Date[]): { block: SprintBlock; startIdx: number; endIdx: number }[] {
  const result: { block: SprintBlock; startIdx: number; endIdx: number }[] = [];

  for (const block of SPRINT_BLOCKS) {
    const blockStart = parseISO(block.start);
    const blockEnd = parseISO(block.end);

    let startIdx = -1;
    let endIdx = -1;

    days.forEach((day, idx) => {
      if (isSameDay(day, blockStart) || (startIdx === -1 && isWithinInterval(day, { start: blockStart, end: blockEnd }))) {
        if (startIdx === -1) startIdx = idx;
      }
      if (isWithinInterval(day, { start: blockStart, end: blockEnd })) {
        endIdx = idx;
      }
    });

    if (startIdx !== -1) {
      result.push({ block, startIdx, endIdx });
    }
  }

  return result;
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const recurringEvents = events.filter((e) => e.recurring);
  const regularEvents = events.filter((e) => !e.recurring);

  const getEventsForDay = (day: Date) =>
    regularEvents.filter((e) => isSameDay(new Date(e.startTime), day));

  const getEventColors = (type: string) =>
    EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.default;

  const weekSprintBlocks = getSprintBlocksForWeek(days);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white">
            {format(weekStart, "d. MMM", { locale: de })} –{" "}
            {format(weekEnd, "d. MMM yyyy", { locale: de })}
          </span>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] rounded-lg transition-colors"
          >
            Heute
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Event
        </button>
      </div>

      {/* Always Running Section */}
      {recurringEvents.length > 0 && (
        <div className="mb-6 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
              Immer aktiv
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recurringEvents.map((event) => {
              const colors = getEventColors(event.type);
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="font-medium">{event.title}</span>
                  <span className="opacity-60">
                    {format(new Date(event.startTime), "HH:mm")}
                    {event.recurring === "daily" ? " · täglich" : " · wöchentlich"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sprint Blocks for this week */}
      {weekSprintBlocks.length > 0 && (
        <div className="mb-4">
          {/* Sprint banner row */}
          <div className="grid grid-cols-7 gap-px bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#2a2a2a]">
            {days.map((day, idx) => {
              const blocksForDay = weekSprintBlocks.filter(
                ({ startIdx, endIdx }) => idx >= startIdx && idx <= endIdx
              );
              return (
                <div key={day.toISOString()} className="bg-[#161616] min-h-[28px] flex flex-col gap-0.5 p-0.5">
                  {blocksForDay.map(({ block, startIdx, endIdx }) => {
                    // Only render the label at the start of the block (or start of week)
                    const isFirst = idx === startIdx;
                    return (
                      <div
                        key={block.label}
                        className="h-6 rounded-sm flex items-center px-1.5 text-[10px] font-semibold truncate"
                        style={{
                          backgroundColor: `${block.color}25`,
                          color: block.color,
                          border: `1px solid ${block.color}40`,
                        }}
                        title={`${block.label}: ${block.start} – ${block.end}`}
                      >
                        {isFirst ? block.label : ""}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week Grid */}
      <div className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "py-3 text-center border-r border-[#2a2a2a] last:border-r-0",
                isToday(day) ? "bg-emerald-500/5" : ""
              )}
            >
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">
                {format(day, "EEE", { locale: de })}
              </div>
              <div
                className={cn(
                  "text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full",
                  isToday(day)
                    ? "bg-emerald-500 text-white"
                    : "text-white"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Events per day */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 border-r border-[#2a2a2a] last:border-r-0 space-y-1",
                  isToday(day) ? "bg-emerald-500/3" : ""
                )}
              >
                {dayEvents.map((event) => {
                  const colors = getEventColors(event.type);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer hover:opacity-80 transition-opacity",
                        colors.bg,
                        colors.text,
                        colors.border
                      )}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="opacity-60">
                        {format(new Date(event.startTime), "HH:mm")}
                        {event.endTime &&
                          ` – ${format(new Date(event.endTime), "HH:mm")}`}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length === 0 && isToday(day) && (
                  <div className="text-[11px] text-zinc-700 text-center mt-4">
                    Keine Events
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
