"use client";

import { useState, useMemo } from "react";
import { Clock, AlertTriangle, CheckCircle, BarChart2, Edit2, Save, X } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isBefore } from "date-fns";
import { de } from "date-fns/locale";

interface TimeEntryData {
  id: string;
  duration: number | null;
  startTime: string | Date;
  endTime: string | Date | null;
  userId: string | null;
  billable: boolean;
  description: string | null;
}

interface TaskWithEntries {
  id: string;
  title: string;
  timeEntries: TimeEntryData[];
}

interface ProjectData {
  id: string;
  name: string;
  color: string;
  hourBudget: number | null;
  tasks: TaskWithEntries[];
}

interface Props {
  project: ProjectData;
}

function toDate(val: string | Date): Date {
  return typeof val === "string" ? parseISO(val) : val;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function ProjectZeiterfassung({ project }: Props) {
  const [hourBudget, setHourBudget] = useState<number | null>(project.hourBudget);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(project.hourBudget ?? ""));
  const [savingBudget, setSavingBudget] = useState(false);

  // Alle abgeschlossenen Zeiteinträge
  const allEntries = useMemo(() =>
    project.tasks.flatMap((t) =>
      t.timeEntries
        .filter((e) => e.endTime)
        .map((e) => ({ ...e, taskTitle: t.title }))
    ),
    [project.tasks]
  );

  // Gesamtminuten
  const totalMinutes = useMemo(() =>
    allEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0),
    [allEntries]
  );

  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const budgetUsedPercent = hourBudget && hourBudget > 0
    ? Math.round((totalHours / hourBudget) * 100)
    : null;

  const isWarning = budgetUsedPercent !== null && budgetUsedPercent >= 80;
  const isOverBudget = budgetUsedPercent !== null && budgetUsedPercent >= 100;

  // Task-Auswertung
  const taskStats = useMemo(() =>
    project.tasks
      .map((t) => {
        const mins = t.timeEntries
          .filter((e) => e.endTime)
          .reduce((sum, e) => sum + (e.duration ?? 0), 0);
        return { id: t.id, title: t.title, minutes: mins };
      })
      .filter((t) => t.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes),
    [project.tasks]
  );

  // Monatliche Auswertung
  const monthlyStats = useMemo(() => {
    const byMonth: Record<string, number> = {};
    allEntries.forEach((e) => {
      const key = format(toDate(e.startTime), "yyyy-MM");
      byMonth[key] = (byMonth[key] ?? 0) + (e.duration ?? 0);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, mins]) => ({
        month,
        label: format(parseISO(month + "-01"), "MMMM yyyy", { locale: de }),
        minutes: mins,
        hours: Math.round(mins / 60 * 10) / 10,
      }));
  }, [allEntries]);

  const maxMonthMinutes = Math.max(...monthlyStats.map((m) => m.minutes), 1);

  async function saveBudget() {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val < 0) return;
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourBudget: val }),
      });
      if (res.ok) {
        setHourBudget(val);
        setEditingBudget(false);
      }
    } finally {
      setSavingBudget(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ─── Stundenbudget Karte ─── */}
      <div className={`bg-[#1c1c1c] border rounded-xl p-6 ${
        isOverBudget ? "border-red-500/40" : isWarning ? "border-yellow-500/40" : "border-[#2a2a2a]"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Stundenbudget</h2>
          </div>
          {!editingBudget ? (
            <button
              onClick={() => { setBudgetInput(String(hourBudget ?? "")); setEditingBudget(true); }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-[#252525] transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Budget setzen
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="z.B. 100"
                className="w-24 bg-[#252525] border border-[#3a3a3a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-xs text-zinc-600">Stunden</span>
              <button
                onClick={saveBudget}
                disabled={savingBudget}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingBudget(false)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Erfasste Stunden</p>
            <p className="text-2xl font-bold text-white">{formatMinutes(totalMinutes)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Stundenbudget</p>
            <p className="text-2xl font-bold text-zinc-300">
              {hourBudget ? `${hourBudget}h` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Verbrauch</p>
            <p className={`text-2xl font-bold ${
              isOverBudget ? "text-red-400" : isWarning ? "text-yellow-400" : "text-emerald-400"
            }`}>
              {budgetUsedPercent !== null ? `${budgetUsedPercent}%` : "—"}
            </p>
          </div>
        </div>

        {hourBudget && hourBudget > 0 && (
          <>
            <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(budgetUsedPercent ?? 0, 100)}%` }}
              />
            </div>
            {isWarning && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                isOverBudget
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-yellow-500/10 border border-yellow-500/20"
              }`}>
                <AlertTriangle className={`w-4 h-4 ${isOverBudget ? "text-red-400" : "text-yellow-400"}`} />
                <p className={`text-xs ${isOverBudget ? "text-red-300" : "text-yellow-300"}`}>
                  {isOverBudget
                    ? `⚠ Stundenbudget überschritten! ${formatMinutes(totalMinutes - hourBudget * 60)} über Budget.`
                    : `Achtung: ${budgetUsedPercent}% des Stundenbudgets verbraucht. Noch ${formatMinutes(hourBudget * 60 - totalMinutes)} verfügbar.`
                  }
                </p>
              </div>
            )}
            {!isWarning && budgetUsedPercent !== null && (
              <p className="text-xs text-zinc-600">
                Noch {formatMinutes(hourBudget * 60 - totalMinutes)} verfügbar
              </p>
            )}
          </>
        )}
      </div>

      {/* ─── Monatsübersicht Balkendiagramm ─── */}
      {monthlyStats.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Stunden nach Monat</h3>
          </div>
          <div className="space-y-2">
            {monthlyStats.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-28 shrink-0">{m.label}</span>
                <div className="flex-1 h-5 bg-[#2a2a2a] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${(m.minutes / maxMonthMinutes) * 100}%`,
                      backgroundColor: project.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-300 w-12 text-right tabular-nums font-mono">
                  {m.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Task-Auswertung ─── */}
      {taskStats.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-white">Stunden nach Task</h3>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {taskStats.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                <span className="flex-1 text-sm text-white truncate">{t.title}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.minutes / taskStats[0].minutes) * 100}%`,
                        backgroundColor: project.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-300 w-16 text-right tabular-nums">
                    {formatMinutes(t.minutes)}
                  </span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 flex items-center gap-3 bg-[#161616]">
              <div className="w-2 h-2 rounded-full shrink-0 bg-zinc-500" />
              <span className="flex-1 text-xs font-semibold text-zinc-400">Gesamt</span>
              <span className="text-sm font-bold text-white">{formatMinutes(totalMinutes)}</span>
            </div>
          </div>
        </div>
      )}

      {allEntries.length === 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">Noch keine Zeiteinträge für dieses Projekt</p>
        </div>
      )}
    </div>
  );
}
