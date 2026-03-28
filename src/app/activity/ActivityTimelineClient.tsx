"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatRelativeTime, getActionLabel, getEntityTypeLabel } from "@/lib/utils";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { Activity, RefreshCw, ChevronDown, Filter } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  projectId?: string | null;
  createdAt: string;
  user?: { name: string; avatar?: string | null } | null;
  project?: { name: string; color: string } | null;
}

interface Props {
  projects: Project[];
  users: User[];
}

const ACTION_TYPES = [
  { value: "", label: "Alle Typen" },
  { value: "created", label: "Task erstellt" },
  { value: "commented", label: "Kommentar" },
  { value: "status_changed", label: "Status geändert" },
  { value: "reaction", label: "Reaktion" },
  { value: "updated", label: "Aktualisiert" },
  { value: "deleted", label: "Gelöscht" },
];

function getDotColor(action: string): string {
  if (action === "completed" || action === "done" || action === "status_changed") return "bg-emerald-500";
  if (action === "updated") return "bg-orange-400";
  if (action === "created") return "bg-blue-400";
  if (action === "deleted") return "bg-red-400";
  if (action === "commented") return "bg-purple-400";
  if (action === "reaction") return "bg-pink-400";
  return "bg-zinc-500";
}

function getActionBadgeColor(action: string): string {
  if (action === "completed" || action === "done" || action === "status_changed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (action === "updated") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (action === "created") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (action === "deleted") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (action === "commented") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (action === "reaction") return "bg-pink-500/10 text-pink-400 border-pink-500/20";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

function groupByDay(logs: ActivityLog[]): Array<{ label: string; logs: ActivityLog[] }> {
  const groups: Record<string, ActivityLog[]> = {};
  const order: string[] = [];

  for (const log of logs) {
    const date = new Date(log.createdAt);
    let label: string;
    if (isToday(date)) label = "Heute";
    else if (isYesterday(date)) label = "Gestern";
    else if (isThisWeek(date)) label = "Diese Woche";
    else label = "Älter";

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(log);
  }

  return order.map((label) => ({ label, logs: groups[label] }));
}

export function ActivityTimelineClient({ projects, users }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Filter-State
  const [projectFilter, setProjectFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // SSE
  const esRef = useRef<EventSource | null>(null);

  const buildUrl = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams({ limit: "20" });
      if (projectFilter) params.set("projectId", projectFilter);
      if (userFilter) params.set("userId", userFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (cursor) params.set("cursor", cursor);
      return `/api/activity?${params.toString()}`;
    },
    [projectFilter, userFilter, typeFilter]
  );

  const fetchLogs = useCallback(
    async (append = false, cursor?: string) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetch(buildUrl(cursor));
        if (res.ok) {
          const data = await res.json();
          const newLogs: ActivityLog[] = data.logs ?? [];
          if (append) {
            setLogs((prev) => [...prev, ...newLogs]);
          } else {
            setLogs(newLogs);
          }
          setNextCursor(data.nextCursor ?? null);
          setIsLive(true);
        }
      } catch {
        setIsLive(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildUrl]
  );

  // Filter-Change → neu laden
  useEffect(() => {
    setNextCursor(null);
    fetchLogs(false);
  }, [fetchLogs]);

  // SSE für Echtzeit-Updates
  useEffect(() => {
    const connect = () => {
      if (esRef.current) esRef.current.close();

      const es = new EventSource("/api/activity/stream");
      esRef.current = es;

      es.addEventListener("connected", () => setIsLive(true));
      es.addEventListener("heartbeat", () => setIsLive(true));

      es.addEventListener("activity_update", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data.logs) && data.logs.length > 0) {
            setLogs((prev) => {
              const existingIds = new Set(prev.map((l) => l.id));
              const newer = data.logs.filter((l: ActivityLog) => !existingIds.has(l.id));
              return newer.length > 0 ? [...newer, ...prev] : prev;
            });
          }
        } catch {}
      });

      es.onerror = () => {
        setIsLive(false);
        es.close();
        esRef.current = null;
        setTimeout(connect, 30_000);
      };
    };

    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  const grouped = groupByDay(logs);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Aktivitäts-Timeline</h1>
            <p className="text-xs text-zinc-500">Globaler Feed · alle Projekte</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600" />
            )}
          </span>
          <span className="text-xs text-zinc-500">{isLive ? "Live" : "Offline"}</span>
          <button
            onClick={() => fetchLogs(false)}
            className="p-1.5 rounded-lg hover:bg-[#252525] text-zinc-500 hover:text-white transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Projekt */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Projekt</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Alle Projekte</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Benutzer</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Alle Benutzer</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Typ */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Aktivitäts-Typ</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Lädt...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Activity className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">Keine Aktivitäten gefunden</p>
            {(projectFilter || userFilter || typeFilter) && (
              <button
                onClick={() => {
                  setProjectFilter("");
                  setUserFilter("");
                  setTypeFilter("");
                }}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div>
            {grouped.map(({ label, logs: groupLogs }) => (
              <div key={label}>
                {/* Tag-Trennlinie */}
                <div className="sticky top-0 z-10 px-5 py-2.5 bg-[#161616] border-b border-[#222] flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-[10px] text-zinc-700">({groupLogs.length})</span>
                </div>

                {/* Einträge */}
                <div className="divide-y divide-[#1e1e1e]">
                  {groupLogs.map((log) => (
                    <div
                      key={log.id}
                      className="px-5 py-4 hover:bg-[#1e1e1e] transition-colors flex items-start gap-4"
                    >
                      {/* Dot */}
                      <div className="mt-1 shrink-0 flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(log.action)}`} />
                        <div className="w-px h-full bg-[#2a2a2a] mt-1.5" />
                      </div>

                      {/* Inhalt */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Aktion-Badge */}
                            <span
                              className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-medium ${getActionBadgeColor(log.action)}`}
                            >
                              {getActionLabel(log.action)}
                            </span>
                            {/* Entity-Typ */}
                            <span className="text-[10px] text-zinc-600">
                              {getEntityTypeLabel(log.entityType)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-600 shrink-0 whitespace-nowrap">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-white font-medium truncate mb-1">
                          {log.entityName}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                          {log.user && (
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center text-[8px] font-bold text-white">
                                {log.user.name.charAt(0)}
                              </span>
                              {log.user.name}
                            </span>
                          )}
                          {log.project && (
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: log.project.color }}
                              />
                              {log.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Mehr laden */}
            {nextCursor && (
              <div className="px-5 py-4 border-t border-[#2a2a2a] flex justify-center">
                <button
                  onClick={() => fetchLogs(true, nextCursor)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white px-4 py-2 rounded-lg hover:bg-[#252525] transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  {loadingMore ? "Lädt..." : "Mehr anzeigen"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
