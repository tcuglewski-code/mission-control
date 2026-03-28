"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Activity,
  Users,
  Clock,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Zap,
  Radio,
  Timer,
} from "lucide-react";

// ── Typen ──────────────────────────────────────────────────────────────────

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string | null;
  lastAction: string;
  lastAt: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  createdAt: string;
  user?: { id: string; name: string; avatar?: string | null } | null;
  project?: { name: string; color: string } | null;
}

interface DeadlineTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  project?: { name: string; color: string } | null;
}

interface ProjectHealth {
  id: string;
  name: string;
  color: string;
  status: string;
  progress: number;
  taskCount: number;
  healthScore: number;
  lastActivityAt: string | null;
}

interface LiveData {
  activeNow: ActiveUser[];
  recentLogs: ActivityLog[];
  nextDeadline: DeadlineTask | null;
  projects: ProjectHealth[];
  generatedAt: string;
}

type HealthFilter = "alle" | "kritisch" | "ok";

// ── Icons & Labels ─────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  created: "✨",
  updated: "✏️",
  deleted: "🗑️",
  completed: "✅",
  done: "✅",
  status_changed: "🔄",
  assigned: "👤",
  commented: "💬",
  deployed: "🚀",
  reaction: "❤️",
};

const ACTION_LABELS: Record<string, string> = {
  created: "erstellt",
  updated: "aktualisiert",
  deleted: "gelöscht",
  completed: "abgeschlossen",
  done: "erledigt",
  status_changed: "Status geändert",
  assigned: "zugewiesen",
  commented: "kommentiert",
  deployed: "deployed",
  reaction: "reagiert",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10",
  high: "text-orange-400 bg-orange-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  low: "text-blue-400 bg-blue-500/10",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Dringend",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

// ── Helfer-Komponenten ─────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function HealthBadge({ score }: { score: number }) {
  if (score >= 80)
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
        <CheckCircle2 className="w-3 h-3" />
        {score}%
      </span>
    );
  if (score >= 50)
    return (
      <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
        <Heart className="w-3 h-3" />
        {score}%
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
      <AlertTriangle className="w-3 h-3" />
      {score}%
    </span>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = [
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "bg-rose-500/20 text-rose-400 border-rose-500/30",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const s = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  return (
    <div
      className={cn(
        "rounded-full border flex items-center justify-center font-semibold shrink-0",
        s,
        colors[idx]
      )}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── Countdown-Komponente ───────────────────────────────────────────────────

function DeadlineCountdown({ dueDate }: { dueDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const due = new Date(dueDate);
      const diff = due.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Überfällig!");
        setUrgent(true);
        return;
      }
      setUrgent(diff < 24 * 60 * 60 * 1000); // < 24h = urgent
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      if (d > 0) setTimeLeft(`${d}T ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [dueDate]);

  return (
    <span
      className={cn(
        "font-mono font-bold text-lg tabular-nums",
        urgent ? "text-red-400 animate-pulse" : "text-emerald-400"
      )}
    >
      {timeLeft}
    </span>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────

export function LiveDashboardClient() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [liveEvents, setLiveEvents] = useState<ActivityLog[]>([]);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("alle");
  const [isConnected, setIsConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-Refresh alle 60 Sekunden
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // SSE-Stream für Echtzeit-Aktivitäten
  useEffect(() => {
    const connect = () => {
      sseRef.current?.close();
      const es = new EventSource("/api/activity/stream");
      sseRef.current = es;

      es.addEventListener("connected", () => setIsConnected(true));

      es.addEventListener("activity_update", (event) => {
        try {
          const payload = JSON.parse(event.data);
          const logs: ActivityLog[] = payload.logs ?? [];
          if (logs.length > 0) {
            setLiveEvents((prev) => [...logs, ...prev].slice(0, 30));
            // Auch Hauptdaten kurz neu laden
            fetchData();
          }
        } catch {}
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        setTimeout(connect, 15_000);
      };
    };

    connect();
    return () => {
      sseRef.current?.close();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchData]);

  // Merge SSE-Events mit API-Daten
  const allLogs = [
    ...liveEvents,
    ...(data?.recentLogs ?? []),
  ].filter(
    (log, idx, self) => self.findIndex((l) => l.id === log.id) === idx
  );

  const filteredProjects = (data?.projects ?? []).filter((p) => {
    if (healthFilter === "kritisch") return p.healthScore < 50;
    if (healthFilter === "ok") return p.healthScore >= 50;
    return true;
  });

  const kritischCount = (data?.projects ?? []).filter((p) => p.healthScore < 50).length;

  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#161616] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Radio className="w-4.5 h-4.5 text-emerald-400" />
              {isConnected && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Live Dashboard</h1>
              <p className="text-xs text-zinc-500">
                {isConnected ? "Echtzeit-Stream aktiv" : "Verbinde..."}
                {lastUpdate && (
                  <> · Aktualisiert {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: de })}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] hover:border-[#3a3a3a] hover:bg-[#222] text-sm text-zinc-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500 text-sm gap-3">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Lade Live-Daten…
          </div>
        ) : (
          <>
            {/* ── Obere Zeile ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Aktiv jetzt */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Aktiv jetzt</h2>
                  <span className="ml-auto text-xs text-zinc-500 bg-[#222] px-2 py-0.5 rounded-full">
                    letzte 5 Min
                  </span>
                </div>
                {data?.activeNow.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-4 text-center">Niemand aktiv</p>
                ) : (
                  <div className="space-y-3">
                    {data?.activeNow.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={u.name} size="md" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#1a1a1a]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.name}</p>
                          <p className="text-xs text-zinc-500 truncate">
                            {ACTION_ICONS[u.lastAction] ?? "•"}{" "}
                            {ACTION_LABELS[u.lastAction] ?? u.lastAction} ·{" "}
                            {formatDistanceToNow(new Date(u.lastAt), { addSuffix: true, locale: de })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nächste Deadline */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Nächste Deadline</h2>
                </div>
                {!data?.nextDeadline ? (
                  <p className="text-xs text-zinc-600 py-4 text-center">Keine fälligen Tasks</p>
                ) : (
                  <div className="space-y-3">
                    <DeadlineCountdown dueDate={data.nextDeadline.dueDate} />
                    <div className="space-y-1.5 pt-1 border-t border-[#2a2a2a]">
                      <p className="text-sm text-white font-medium leading-snug line-clamp-2">
                        {data.nextDeadline.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {data.nextDeadline.project && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a2a] text-zinc-400"
                            style={{ borderLeft: `3px solid ${data.nextDeadline.project.color}` }}
                          >
                            {data.nextDeadline.project.name}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            PRIORITY_COLORS[data.nextDeadline.priority] ?? "text-zinc-400 bg-zinc-500/10"
                          )}
                        >
                          {PRIORITY_LABELS[data.nextDeadline.priority] ?? data.nextDeadline.priority}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(data.nextDeadline.dueDate).toLocaleDateString("de-DE", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live-Stream Status */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Live-Stream</h2>
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
                      isConnected
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                    )}
                  >
                    {isConnected ? "● Verbunden" : "○ Getrennt"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Aktive Nutzer (5 Min)</span>
                    <span className="text-white font-semibold">{data?.activeNow.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Events (letzte Stunde)</span>
                    <span className="text-white font-semibold">{data?.recentLogs.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Projekte gesamt</span>
                    <span className="text-white font-semibold">{data?.projects.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Kritische Projekte</span>
                    <span className={cn("font-semibold", kritischCount > 0 ? "text-red-400" : "text-zinc-500")}>
                      {kritischCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Mittlere Zeile: Aktivitäten + Health-Monitor ────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Echtzeit-Aktivitäten */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-semibold text-white">Task-Updates (letzte Stunde)</h2>
                  </div>
                  <span className="text-xs text-zinc-500 bg-[#222] px-2 py-0.5 rounded-full">
                    {allLogs.length} Einträge
                  </span>
                </div>
                <div className="divide-y divide-[#222] max-h-[420px] overflow-y-auto">
                  {allLogs.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-8 text-center">
                      Keine Aktivitäten in der letzten Stunde
                    </p>
                  ) : (
                    allLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-5 py-3 hover:bg-[#1e1e1e] transition-colors"
                      >
                        <span className="text-base mt-0.5 shrink-0">
                          {ACTION_ICONS[log.action] ?? "•"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 leading-snug">
                            <span className="font-medium text-white">
                              {log.entityName.length > 35
                                ? log.entityName.slice(0, 35) + "…"
                                : log.entityName}
                            </span>{" "}
                            <span className="text-zinc-500">wurde</span>{" "}
                            <span className="text-zinc-400">
                              {ACTION_LABELS[log.action] ?? log.action}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {log.user && (
                              <span className="text-[10px] text-zinc-500">
                                von <span className="text-zinc-400">{log.user.name}</span>
                              </span>
                            )}
                            {log.project && (
                              <span
                                className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-[#252525]"
                                style={{ borderLeft: `2px solid ${log.project.color}` }}
                              >
                                {log.project.name}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-600">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                                locale: de,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Health-Monitor */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <h2 className="text-sm font-semibold text-white">Projekt-Gesundheit</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    {(["alle", "kritisch", "ok"] as HealthFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setHealthFilter(f)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-md transition-colors capitalize",
                          healthFilter === f
                            ? f === "kritisch"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : f === "ok"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-[#2a2a2a] text-white border border-[#3a3a3a]"
                            : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                        )}
                      >
                        {f === "alle" ? "Alle" : f === "kritisch" ? "⚠ Kritisch" : "✓ OK"}
                        {f === "kritisch" && kritischCount > 0 && (
                          <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">
                            {kritischCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-[#222] max-h-[420px] overflow-y-auto">
                  {filteredProjects.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-8 text-center">
                      Keine Projekte in dieser Kategorie
                    </p>
                  ) : (
                    filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "px-5 py-3.5 hover:bg-[#1e1e1e] transition-colors",
                          p.healthScore < 50 ? "border-l-2 border-red-500/60" : ""
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-sm font-medium text-white truncate">{p.name}</span>
                            {p.healthScore < 50 && (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                          </div>
                          <HealthBadge score={p.healthScore} />
                        </div>
                        <HealthBar score={p.healthScore} />
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-600">
                          <span>{p.taskCount} Tasks · {p.progress}% Fortschritt</span>
                          {p.lastActivityAt && (
                            <span>
                              {formatDistanceToNow(new Date(p.lastActivityAt), {
                                addSuffix: true,
                                locale: de,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-5 py-2.5 border-t border-[#2a2a2a] text-[10px] text-zinc-600 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />
                  Auto-Refresh alle 60 Sekunden
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
