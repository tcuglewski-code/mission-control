"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle, RefreshCw, X, ArrowRight, ChevronLeft, Users } from "lucide-react";
import Link from "next/link";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface WeekInfo {
  key: string;
  start: string;
  end: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  dueDate: string;
  assigneeId: string | null;
  project: { id: string; name: string; color: string } | null;
}

interface UserInfo {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  weeklyCapacity: number;
}

interface WeekData {
  count: number;
  tasks: TaskItem[];
}

interface ResourceData {
  users: UserInfo[];
  weeks: WeekInfo[];
  data: Record<string, Record<string, WeekData>>;
}

// ─── Story Points → Stunden ───────────────────────────────────────────────────

const SP_TO_HOURS = 2; // 1 SP = 2 Stunden

function calcHours(tasks: TaskItem[]): number {
  return tasks.reduce((sum, t) => sum + (t.storyPoints ?? 1) * SP_TO_HOURS, 0);
}

// ─── Farb-Kodierung ──────────────────────────────────────────────────────────

function getCellColor(count: number): string {
  if (count === 0) return "bg-zinc-900 text-zinc-600";
  if (count < 5) return "bg-emerald-900/40 text-emerald-300 border-emerald-800/50";
  if (count <= 8) return "bg-yellow-900/40 text-yellow-300 border-yellow-800/50";
  return "bg-red-900/50 text-red-300 border-red-800/50";
}

function getCapacityWarning(hours: number, capacity: number): boolean {
  return capacity > 0 && (hours / capacity) >= 0.8;
}

// ─── Umverteilen Modal ───────────────────────────────────────────────────────

interface UmverteilenModalProps {
  user: UserInfo;
  weekKey: string;
  tasks: TaskItem[];
  allUsers: UserInfo[];
  onClose: () => void;
  onReassign: (taskId: string, newUserId: string) => Promise<void>;
}

function UmverteilenModal({ user, weekKey, tasks, allUsers, onClose, onReassign }: UmverteilenModalProps) {
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const handleReassign = async (taskId: string) => {
    const newUserId = selected[taskId];
    if (!newUserId) return;
    setReassigning(taskId);
    try {
      await onReassign(taskId, newUserId);
    } finally {
      setReassigning(null);
    }
  };

  const otherUsers = allUsers.filter((u) => u.id !== user.id);
  const weekDate = new Date(weekKey);
  const weekLabel = format(weekDate, "'KW' w, dd. MMM", { locale: de });

  const PRIORITY_COLOR: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-zinc-400",
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-yellow-400" />
              Tasks umverteilen
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {user.name} · {weekLabel} · {tasks.length} Tasks
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
          {tasks.length === 0 ? (
            <p className="p-8 text-center text-xs text-zinc-600">Keine Tasks in dieser Woche</p>
          ) : (
            <div className="p-4 space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="bg-[#252525] rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-[10px] font-bold mt-0.5 ${PRIORITY_COLOR[task.priority] ?? "text-zinc-400"}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-300 flex-1 leading-relaxed">{task.title}</span>
                    {task.storyPoints && (
                      <span className="text-[10px] text-zinc-600 shrink-0">{task.storyPoints} SP</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={selected[task.id] ?? ""}
                      onChange={(e) => setSelected({ ...selected, [task.id]: e.target.value })}
                      className="flex-1 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
                      <option value="">— Mitglied wählen —</option>
                      {otherUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.avatar ? `${u.avatar} ` : ""}{u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReassign(task.id)}
                      disabled={!selected[task.id] || reassigning === task.id}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors font-medium">
                      {reassigning === task.id ? "..." : "Zuweisen"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#2a2a2a] flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ────────────────────────────────────────────────────────

export function ResourcesClient() {
  const [data, setData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [umverteilenTarget, setUmverteilenTarget] = useState<{
    user: UserInfo;
    weekKey: string;
    tasks: TaskItem[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/resources");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReassign = async (taskId: string, newUserId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: newUserId }),
    });
    if (res.ok) {
      await load();
      setUmverteilenTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-500 text-sm animate-pulse">Lade Ressourcendaten...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-500 text-sm">Fehler beim Laden der Daten.</div>
      </div>
    );
  }

  const { users, weeks, data: cellData } = data;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/team"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Team
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-xs text-zinc-300">Ressourcenplanung</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">1 SP = {SP_TO_HOURS}h · Standard: 40h/Woche</span>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg transition-colors">
            <RefreshCw className="w-3 h-3" />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* ─── Legende ─── */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-zinc-500">Legende:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-900/60 border border-emerald-800/50 inline-block" />
          <span className="text-zinc-400">Grün (&lt;5 Tasks)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-900/60 border border-yellow-800/50 inline-block" />
          <span className="text-zinc-400">Gelb (5–8 Tasks)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-900/60 border border-red-800/50 inline-block" />
          <span className="text-zinc-400">Rot (&gt;8 = Überlastung)</span>
        </span>
      </div>

      {/* ─── Ressourcentabelle ─── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 w-48 sticky left-0 bg-[#1a1a1a] z-10">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Mitglied
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-zinc-400 w-20 border-l border-[#2a2a2a]">
                  Kapazität
                </th>
                {weeks.map((week) => (
                  <th key={week.key} className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 border-l border-[#2a2a2a] min-w-[120px]">
                    <div className="text-zinc-300">
                      {format(new Date(week.start), "'KW' w", { locale: de })}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-normal mt-0.5">
                      {format(new Date(week.start), "dd.MM", { locale: de })} – {format(new Date(week.end), "dd.MM", { locale: de })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const userRows = cellData[user.id] ?? {};
                const isOverloaded = weeks.some((w) => (userRows[w.key]?.count ?? 0) > 8);
                const emoji = user.avatar ?? (user.role === "agent" ? "🤖" : "👤");

                return (
                  <tr key={user.id}
                    className={`border-b border-[#2a2a2a] last:border-0 ${idx % 2 === 0 ? "bg-[#1a1a1a]" : "bg-[#1c1c1c]"}`}>
                    {/* Mitglied */}
                    <td className={`px-4 py-3 sticky left-0 z-10 ${idx % 2 === 0 ? "bg-[#1a1a1a]" : "bg-[#1c1c1c]"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <div>
                          <div className="text-xs font-medium text-white">{user.name}</div>
                          <div className="text-[10px] text-zinc-600">{user.role === "agent" ? "KI-Agent" : "Mensch"}</div>
                        </div>
                        {isOverloaded && (
                          <span title="Überlastet">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 ml-auto shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kapazität */}
                    <td className="px-3 py-3 border-l border-[#2a2a2a]">
                      <div className="text-xs text-zinc-400 text-center">{user.weeklyCapacity}h</div>
                      <div className="text-[10px] text-zinc-600 text-center">{Math.round(user.weeklyCapacity / SP_TO_HOURS)} SP max</div>
                    </td>

                    {/* Wochen-Zellen */}
                    {weeks.map((week) => {
                      const cell = userRows[week.key] ?? { count: 0, tasks: [] };
                      const hours = calcHours(cell.tasks);
                      const isWarn = getCapacityWarning(hours, user.weeklyCapacity);
                      const isOver = cell.count > 8;

                      return (
                        <td key={week.key} className="px-2 py-2 border-l border-[#2a2a2a]">
                          <div className={`rounded-lg p-2 text-center border ${getCellColor(cell.count)}`}>
                            <div className="text-sm font-bold">{cell.count}</div>
                            <div className="text-[10px] opacity-75 mt-0.5">{hours}h</div>
                            {isWarn && (
                              <div className="text-[9px] text-orange-400 mt-0.5">
                                ⚠ &gt;80%
                              </div>
                            )}
                            {isOver && (
                              <button
                                onClick={() => setUmverteilenTarget({ user, weekKey: week.key, tasks: cell.tasks })}
                                className="mt-1.5 text-[9px] font-semibold px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md transition-colors w-full">
                                Umverteilen
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-zinc-600 text-sm">
            Keine Teammitglieder gefunden.
          </div>
        )}
      </div>

      {/* ─── Kapazitäts-Warnungen ─── */}
      {users.some((u) =>
        weeks.some((w) => getCapacityWarning(calcHours(cellData[u.id]?.[w.key]?.tasks ?? []), u.weeklyCapacity))
      ) && (
        <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Kapazitäts-Warnungen
          </h3>
          <div className="space-y-1">
            {users.flatMap((u) =>
              weeks.filter((w) =>
                getCapacityWarning(calcHours(cellData[u.id]?.[w.key]?.tasks ?? []), u.weeklyCapacity)
              ).map((w) => {
                const hours = calcHours(cellData[u.id]?.[w.key]?.tasks ?? []);
                const pct = Math.round((hours / u.weeklyCapacity) * 100);
                return (
                  <div key={`${u.id}-${w.key}`} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      {u.avatar ?? "👤"} <strong className="text-white">{u.name}</strong> in KW{format(new Date(w.start), "w", { locale: de })}
                    </span>
                    <span className="text-orange-400 font-medium">{pct}% Auslastung ({hours}h / {u.weeklyCapacity}h)</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Umverteilen Modal ─── */}
      {umverteilenTarget && (
        <UmverteilenModal
          user={umverteilenTarget.user}
          weekKey={umverteilenTarget.weekKey}
          tasks={umverteilenTarget.tasks}
          allUsers={users}
          onClose={() => setUmverteilenTarget(null)}
          onReassign={handleReassign}
        />
      )}
    </div>
  );
}
