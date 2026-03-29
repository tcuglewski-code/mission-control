"use client";

import { useState } from "react";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import { de } from "date-fns/locale";

interface ActivityHeatmapProps {
  /** Map of ISO-date-string (YYYY-MM-DD) → task count */
  dateCounts: Record<string, number>;
  weeks?: number;
}

// Waldgrün Intensitätsstufen
const COLORS = [
  "#1f1f23", // 0 — keine
  "#14532d", // 1-2 — wenige
  "#166534", // 3-4 — mittel
  "#15803d", // 5-7 — viel
  "#16a34a", // 8+ — sehr viel
];

function getColor(count: number): string {
  if (count === 0) return COLORS[0];
  if (count <= 2) return COLORS[1];
  if (count <= 4) return COLORS[2];
  if (count <= 7) return COLORS[3];
  return COLORS[4];
}

function getLabel(count: number): string {
  if (count === 0) return "keine";
  if (count <= 2) return "wenige";
  if (count <= 4) return "mittel";
  if (count <= 7) return "viel";
  return "sehr viel";
}

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;

export function ActivityHeatmap({ dateCounts, weeks = 12 }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
  } | null>(null);

  // Berechne Startdatum (Montag, 12 Wochen zurück)
  const today = new Date();
  const endDate = today;
  const startDate = startOfWeek(subWeeks(endDate, weeks - 1), { weekStartsOn: 1 });

  // Alle Tage in 2D-Array: [Woche][Wochentag]
  const grid: Array<Array<{ date: Date; dateStr: string; count: number }>> = [];
  let current = new Date(startDate);

  for (let w = 0; w < weeks; w++) {
    const weekCells = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = format(current, "yyyy-MM-dd");
      weekCells.push({
        date: new Date(current),
        dateStr,
        count: dateCounts[dateStr] ?? 0,
      });
      current = addDays(current, 1);
    }
    grid.push(weekCells);
  }

  // Monats-Labels für X-Achse
  const monthLabels: Array<{ label: string; x: number }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const month = grid[w][0].date.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      monthLabels.push({
        label: format(grid[w][0].date, "MMM", { locale: de }),
        x: w * STEP,
      });
    }
  }

  const svgWidth = weeks * STEP;
  const svgHeight = 7 * STEP + 20; // 20 für Monats-Labels oben

  return (
    <div className="relative">
      <div className="flex gap-6 items-start">
        {/* Tag-Labels (Y-Achse) */}
        <div className="flex flex-col gap-0" style={{ paddingTop: 20 }}>
          {DAY_LABELS.map((day) => (
            <div
              key={day}
              className="text-[10px] text-zinc-600 flex items-center"
              style={{ height: STEP, lineHeight: `${CELL}px` }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* SVG Heatmap */}
        <div className="relative">
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ overflow: "visible" }}
          >
            {/* Monats-Labels */}
            {monthLabels.map((m) => (
              <text
                key={`${m.label}-${m.x}`}
                x={m.x}
                y={12}
                className="fill-zinc-600"
                style={{ fontSize: 10, fontFamily: "inherit" }}
              >
                {m.label}
              </text>
            ))}

            {/* Grid Zellen */}
            {grid.map((week, wi) =>
              week.map((cell, di) => {
                const isFuture = cell.date > endDate;
                const color = isFuture ? "transparent" : getColor(cell.count);
                const border = isFuture ? "transparent" : "#2a2a2a";
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * STEP}
                    y={di * STEP + 20}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    ry={2}
                    fill={color}
                    stroke={border}
                    strokeWidth={0.5}
                    style={{ cursor: cell.count > 0 ? "pointer" : "default" }}
                    onMouseEnter={(e) => {
                      if (!isFuture) {
                        const rect = (e.target as SVGRectElement).getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          date: cell.dateStr,
                          count: cell.count,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: tooltip.x,
                top: tooltip.y - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg px-2.5 py-1.5 text-xs text-white shadow-xl whitespace-nowrap">
                <div className="font-medium">
                  {format(new Date(tooltip.date + "T00:00:00"), "EEEE, d. MMMM yyyy", { locale: de })}
                </div>
                <div className="text-zinc-400 mt-0.5">
                  {tooltip.count === 0
                    ? "Keine erledigten Tasks"
                    : `${tooltip.count} Task${tooltip.count !== 1 ? "s" : ""} erledigt`}
                  {tooltip.count > 0 && (
                    <span className="ml-1.5 text-emerald-400">· {getLabel(tooltip.count)}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legende */}
      <div className="flex items-center gap-2 mt-3 ml-8">
        <span className="text-[10px] text-zinc-600">Weniger</span>
        {COLORS.map((color, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm border border-[#2a2a2a]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-[10px] text-zinc-600">Mehr</span>
      </div>
    </div>
  );
}
