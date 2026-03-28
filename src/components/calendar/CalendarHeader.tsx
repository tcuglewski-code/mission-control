"use client";

import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarViewMode = "month" | "week";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: CalendarViewMode) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  const label =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy", { locale: de })
      : format(currentDate, "'KW' w · MMMM yyyy", { locale: de });

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          title="Vorheriger Monat / Woche"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-base font-semibold text-white min-w-[200px] text-center capitalize">
          {label}
        </span>

        <button
          onClick={onNext}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          title="Nächster Monat / Woche"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onToday}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] rounded-lg transition-colors ml-1"
        >
          Heute
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-0.5">
        <button
          onClick={() => onViewChange("month")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            viewMode === "month"
              ? "bg-[#2a2a2a] text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Monat
        </button>
        <button
          onClick={() => onViewChange("week")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            viewMode === "week"
              ? "bg-[#2a2a2a] text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Woche
        </button>
      </div>
    </div>
  );
}
