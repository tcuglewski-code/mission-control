"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Clock, Filter, Calendar, TrendingUp, Download, FileText,
  BarChart2, AlertTriangle, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isAfter, isBefore, eachDayOfInterval, getDay, getDaysInMonth,
  startOfDay, addDays, isSameMonth, parseISO } from "date-fns";
import { de } from "date-fns/locale";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface TimeEntryWithTask {
  id: string;
  taskId: string;
  userId: string | null;
  description: string | null;
  startTime: string | Date;
  endTime: string | Date | null;
  duration: number | null;
  billable: boolean;
  createdAt: string | Date;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string } | null;
  };
}

interface Project { id: string; name: string; color: string }
interface TeamUser { id: string; name: string; email: string }

interface Props {
  initialEntries: TimeEntryWithTask[];
  projects: Project[];
  users: TeamUser[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function toDate(val: string | Date): Date {
  return typeof val === "string" ? parseISO(val) : val;
}

// ─── SVG Balkendiagramm (Wochenansicht) ──────────────────────────────────────

function WeekBarChart({ entries }: { entries: TimeEntryWithTask[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const dayMinutes = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return entries
      .filter((e) => e.endTime && format(toDate(e.startTime), "yyyy-MM-dd") === dayStr)
      .reduce((sum, e) => sum + (e.duration ?? 0), 0);
  });

  const maxMinutes = Math.max(...dayMinutes, 480); // min scale = 8h
  const chartH = 100;
  const barW = 28;
  const gap = 10;
  const totalW = days.length * (barW + gap) - gap;

  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">
          Woche {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
        </h3>
      </div>
      <svg
        viewBox={`0 0 ${totalW + 20} ${chartH + 40}`}
        className="w-full max-w-md"
        style={{ overflow: "visible" }}
      >
        {days.map((day, i) => {
          const mins = dayMinutes[i];
          const barH = maxMinutes > 0 ? (mins / maxMinutes) * chartH : 0;
          const x = i * (barW + gap);
          const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          const color = isToday ? "#10b981" : "#3f3f46";
          const labelColor = isToday ? "#10b981" : "#71717a";

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={chartH - barH + 5}
                width={barW}
                height={Math.max(barH, 2)}
                rx={4}
                fill={color}
                opacity={0.85}
              />
              {/* Hours label above bar */}
              {mins > 0 && (
                <text
                  x={x + barW / 2}
                  y={chartH - barH}
                  textAnchor="middle"
                  fill="#d4d4d8"
                  fontSize="8"
                  dy={-3}
                >
                  {Math.round(mins / 60 * 10) / 10}h
                </text>
              )}
              {/* Day label */}
              <text
                x={x + barW / 2}
                y={chartH + 20}
                textAnchor="middle"
                fill={labelColor}
                fontSize="9"
                fontWeight={isToday ? "bold" : "normal"}
              >
                {dayNames[i]}
              </text>
              <text
                x={x + barW / 2}
                y={chartH + 32}
                textAnchor="middle"
                fill="#52525b"
                fontSize="8"
              >
                {format(day, "d.", { locale: de })}
              </text>
            </g>
          );
        })}
        {/* 8h reference line */}
        <line
          x1={0}
          x2={totalW}
          y1={chartH + 5 - (480 / maxMinutes) * chartH}
          y2={chartH + 5 - (480 / maxMinutes) * chartH}
          stroke="#3f3f46"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={totalW + 4}
          y={chartH + 5 - (480 / maxMinutes) * chartH}
          fill="#52525b"
          fontSize="8"
          dominantBaseline="middle"
        >
          8h
        </text>
      </svg>
    </div>
  );
}

// ─── Monats-Heatmap ───────────────────────────────────────────────────────────

function MonthHeatmap({ entries }: { entries: TimeEntryWithTask[] }) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  // Minutes per day in month
  const dayMinutesMap: Record<string, number> = {};
  entries.forEach((e) => {
    if (!e.endTime) return;
    const d = format(toDate(e.startTime), "yyyy-MM-dd");
    if (d.startsWith(format(viewDate, "yyyy-MM"))) {
      dayMinutesMap[d] = (dayMinutesMap[d] ?? 0) + (e.duration ?? 0);
    }
  });

  const maxMins = Math.max(...Object.values(dayMinutesMap), 1);

  function getHeatColor(mins: number): string {
    if (mins === 0) return "#1f1f1f";
    const intensity = mins / maxMins;
    if (intensity < 0.25) return "#064e3b";
    if (intensity < 0.5) return "#065f46";
    if (intensity < 0.75) return "#047857";
    return "#10b981";
  }

  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">
            {format(viewDate, "MMMM yyyy", { locale: de })}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors text-xs"
          >
            ‹
          </button>
          <button
            onClick={() => setViewDate(new Date())}
            className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            Heute
          </button>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors text-xs"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[9px] text-zinc-600 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${format(viewDate, "yyyy-MM")}-${String(dayNum).padStart(2, "0")}`;
          const mins = dayMinutesMap[dateStr] ?? 0;
          const isToday = dateStr === today;

          return (
            <div
              key={dayNum}
              className="aspect-square rounded flex flex-col items-center justify-center relative group cursor-default"
              style={{ backgroundColor: getHeatColor(mins) }}
              title={mins > 0 ? `${format(toDate(dateStr + "T00:00:00"), "d. MMMM", { locale: de })}: ${formatMinutes(mins)}` : ""}
            >
              <span
                className={`text-[9px] font-medium ${
                  isToday ? "text-white font-bold" : mins > 0 ? "text-emerald-200" : "text-zinc-600"
                }`}
              >
                {dayNum}
              </span>
              {mins > 0 && (
                <span className="text-[7px] text-emerald-300 leading-none">
                  {Math.round(mins / 60 * 10) / 10}h
                </span>
              )}
              {isToday && (
                <div className="absolute inset-0 rounded ring-1 ring-emerald-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[9px] text-zinc-600">weniger</span>
        {["#1f1f1f", "#064e3b", "#065f46", "#047857", "#10b981"].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] text-zinc-600">mehr</span>
      </div>
    </div>
  );
}

// ─── Export-Funktionen ───────────────────────────────────────────────────────

function exportCSV(entries: TimeEntryWithTask[]) {
  const header = ["Datum", "Uhrzeit Start", "Uhrzeit Ende", "Dauer (min)", "Task", "Projekt", "Beschreibung", "Billable", "User ID"];
  const rows = entries
    .filter((e) => e.endTime)
    .map((e) => [
      format(toDate(e.startTime), "dd.MM.yyyy"),
      format(toDate(e.startTime), "HH:mm"),
      e.endTime ? format(toDate(e.endTime as string | Date), "HH:mm") : "",
      e.duration ?? 0,
      `"${e.task.title.replace(/"/g, '""')}"`,
      `"${(e.task.project?.name ?? "").replace(/"/g, '""')}"`,
      `"${(e.description ?? "").replace(/"/g, '""')}"`,
      e.billable ? "Ja" : "Nein",
      e.userId ?? "",
    ]);

  const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zeiterfassung_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDATEV(entries: TimeEntryWithTask[]) {
  // DATEV Buchungsstapel simplified CSV
  const header = [
    "Umsatz (ohne Soll/Haben-Kz)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Kurs",
    "Basis-Umsatz",
    "WKZ Basis-Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "BU-Schlüssel",
    "Belegdatum",
    "Belegfeld 1",
    "Belegfeld 2",
    "Skonto",
    "Buchungstext",
  ];
  const rows = entries
    .filter((e) => e.endTime && e.billable)
    .map((e) => [
      "",   // Umsatz
      "S",  // Soll
      "EUR",
      "",
      "",
      "EUR",
      "8400", // Erlöskonto
      "10000", // Debitor
      "",
      format(toDate(e.startTime), "ddMM"),
      e.id.slice(0, 12),
      "",
      "",
      `"${e.task.project?.name ?? ""} - ${e.task.title} (${Math.round((e.duration ?? 0) / 60 * 100) / 100}h)"`,
    ]);

  const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `datev_zeiterfassung_${format(new Date(), "yyyy-MM")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF() {
  window.print();
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function TimeTrackingClient({ initialEntries, projects, users }: Props) {
  const [entries] = useState<TimeEntryWithTask[]>(initialEntries);

  // Filter state
  const [filterUserId, setFilterUserId] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // View state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeView, setActiveView] = useState<"tabelle" | "woche" | "monat">("woche");

  // Gefilterte Einträge
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterUserId && e.userId !== filterUserId) return false;
      if (filterProjectId && e.task.project?.id !== filterProjectId) return false;
      if (filterFrom) {
        const entryDate = format(toDate(e.startTime), "yyyy-MM-dd");
        if (entryDate < filterFrom) return false;
      }
      if (filterTo) {
        const entryDate = format(toDate(e.startTime), "yyyy-MM-dd");
        if (entryDate > filterTo) return false;
      }
      return true;
    });
  }, [entries, filterUserId, filterProjectId, filterFrom, filterTo]);

  // KPIs
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const weekMinutes = useMemo(() =>
    entries.filter((e) => e.endTime && !isBefore(toDate(e.startTime), weekStart))
      .reduce((sum, e) => sum + (e.duration ?? 0), 0),
    [entries, weekStart]
  );

  const monthMinutes = useMemo(() =>
    entries.filter((e) => e.endTime && !isBefore(toDate(e.startTime), monthStart))
      .reduce((sum, e) => sum + (e.duration ?? 0), 0),
    [entries, monthStart]
  );

  const totalMinutes = useMemo(() =>
    filtered.filter((e) => e.endTime).reduce((sum, e) => sum + (e.duration ?? 0), 0),
    [filtered]
  );

  const resetFilters = () => {
    setFilterUserId("");
    setFilterProjectId("");
    setFilterFrom("");
    setFilterTo("");
  };

  const hasFilters = filterUserId || filterProjectId || filterFrom || filterTo;

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          nav, aside, header, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-table { font-size: 10px; }
          .print-table th, .print-table td { border: 1px solid #ccc; padding: 4px 8px; }
          .print-table th { background: #f0f0f0; font-weight: bold; }
        }
      `}</style>

      <div className="p-6 space-y-6">

        {/* ─── KPI Karten ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-500">Diese Woche</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatMinutes(weekMinutes)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {Math.round(weekMinutes / 60 * 10) / 10}h von ~40h Ziel
            </p>
            <div className="mt-2 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${weekMinutes / 2400 > 1 ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min((weekMinutes / 2400) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-500">Dieser Monat</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{formatMinutes(monthMinutes)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {format(today, "MMMM yyyy", { locale: de })}
            </p>
          </div>

          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">Gesamt (gefiltert)</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatMinutes(totalMinutes)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{filtered.filter((e) => e.endTime).length} Einträge</p>
          </div>
        </div>

        {/* ─── Filter ─── */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 no-print">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400">Filter</span>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-[#252525] transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {users.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600">Mitarbeiter</label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 min-w-[150px]"
                >
                  <option value="">Alle Mitarbeiter</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-600">Projekt</label>
              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 min-w-[150px]"
              >
                <option value="">Alle Projekte</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-600">Von</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-600">Bis</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* ─── Ansicht-Tabs + Export ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div className="flex items-center gap-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-1">
            {(["woche", "monat", "tabelle"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeView === view
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {view === "woche" ? "Wochenansicht" : view === "monat" ? "Monatsübersicht" : "Tabelle"}
              </button>
            ))}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white bg-[#1c1c1c] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              {showExportMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-xl z-50 min-w-[180px] overflow-hidden">
                <button
                  onClick={() => { exportCSV(filtered.filter((e) => e.endTime)); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  CSV-Export
                </button>
                <button
                  onClick={() => { exportDATEV(filtered.filter((e) => e.endTime)); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  DATEV-Export
                </button>
                <div className="border-t border-[#2a2a2a]" />
                <button
                  onClick={() => { exportPDF(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  PDF drucken
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Ansicht Inhalte ─── */}
        {activeView === "woche" && (
          <WeekBarChart entries={filtered} />
        )}

        {activeView === "monat" && (
          <MonthHeatmap entries={filtered} />
        )}

        {/* ─── Eintrags-Tabelle (auch für PDF) ─── */}
        {activeView === "tabelle" && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between no-print">
              <h3 className="text-sm font-medium text-white">
                Zeiteinträge
                <span className="ml-2 text-xs text-zinc-500">({filtered.length})</span>
              </h3>
            </div>

            {/* Print header */}
            <div className="hidden print:block px-4 py-3 border-b border-gray-300">
              <h2 className="text-base font-bold">Zeiterfassung — Monatsübersicht</h2>
              <p className="text-xs text-gray-500">Erstellt am {format(new Date(), "dd.MM.yyyy HH:mm")}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                Keine Zeiteinträge gefunden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full print-table">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] print:border-gray-300">
                      <th className="px-4 py-2.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Datum</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Uhrzeit</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Task / Projekt</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Beschreibung</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Dauer</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Billable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f] print:divide-gray-200">
                    {filtered.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#1f1f1f] transition-colors print:hover:bg-transparent">
                        <td className="px-4 py-3 text-xs text-zinc-300 whitespace-nowrap">
                          {format(toDate(entry.startTime), "dd.MM.yyyy", { locale: de })}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap font-mono">
                          {format(toDate(entry.startTime), "HH:mm")}
                          {entry.endTime && ` – ${format(toDate(entry.endTime as string | Date), "HH:mm")}`}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-white">{entry.task.title}</p>
                          {entry.task.project && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium print:text-gray-600"
                              style={{
                                backgroundColor: `${entry.task.project.color}20`,
                                color: entry.task.project.color,
                              }}
                            >
                              {entry.task.project.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 hidden sm:table-cell max-w-[160px] truncate">
                          {entry.description ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.endTime ? (
                            <span className="text-xs font-mono text-white tabular-nums">
                              {formatMinutes(entry.duration ?? 0)}
                            </span>
                          ) : (
                            <span className="text-xs text-red-400">läuft</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          {entry.billable ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Ja
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/30 text-zinc-500">
                              Nein
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#2a2a2a] print:border-gray-400">
                      <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-zinc-300 print:text-black">
                        Gesamt
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-white print:text-black">
                        {formatMinutes(totalMinutes)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
