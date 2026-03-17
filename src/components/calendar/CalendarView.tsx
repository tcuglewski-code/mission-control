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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
              Always Running
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
