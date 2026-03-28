"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { isToday, isYesterday, isThisWeek } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  createdAt: string;
  user?: { name: string; avatar?: string | null } | null;
}

type FilterType = "all" | "created" | "updated" | "completed" | "deleted" | "commented";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "created", label: "Erstellt" },
  { value: "updated", label: "Updates" },
  { value: "completed", label: "Erledigt" },
  { value: "commented", label: "Kommentare" },
  { value: "deleted", label: "Gelöscht" },
];

function getDotColor(action: string): string {
  if (action === "completed" || action === "done") return "bg-emerald-500";
  if (action === "status_changed" || action === "updated") return "bg-orange-400";
  if (action === "created") return "bg-blue-400";
  if (action === "deleted") return "bg-red-400";
  if (action === "commented") return "bg-purple-400";
  return "bg-zinc-500";
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: "erstellt",
    updated: "aktualisiert",
    deleted: "gelöscht",
    completed: "erledigt",
    status_changed: "Status geändert",
    assigned: "zugewiesen",
    commented: "kommentiert",
    deployed: "deployed",
  };
  return labels[action] ?? action;
}

function groupLogsByDay(logs: ActivityLog[]): Array<{ label: string; logs: ActivityLog[] }> {
  const groups: Record<string, ActivityLog[]> = {};
  const order: string[] = [];

  for (const log of logs) {
    const date = new Date(log.createdAt);
    let label: string;
    if (isToday(date)) {
      label = "Heute";
    } else if (isYesterday(date)) {
      label = "Gestern";
    } else if (isThisWeek(date)) {
      label = "Diese Woche";
    } else {
      label = "Älter";
    }

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(log);
  }

  return order.map((label) => ({ label, logs: groups[label] }));
}

function matchesFilter(log: ActivityLog, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return log.action === "completed" || log.action === "done" || log.action === "status_changed";
  return log.action === filter;
}

export function LiveActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setIsLive(true);
      }
    } catch (e) {
      console.error("Failed to fetch activity", e);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => matchesFilter(log, filter));
  const grouped = groupLogsByDay(filteredLogs);

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
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
          <span className="text-xs font-semibold text-white">
            Live Aktivität
            {isLive && <span className="ml-1 text-[10px] text-emerald-500 font-normal">● live</span>}
          </span>
        </div>
        <button
          onClick={fetchLogs}
          className="text-zinc-600 hover:text-zinc-300 text-[10px] transition-colors"
          title="Aktualisieren"
        >
          ↻
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[#222] overflow-x-auto scrollbar-none">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`shrink-0 px-2 py-1 text-[10px] rounded transition-colors ${
              filter === opt.value
                ? "bg-[#2a2a2a] text-white"
                : "text-zinc-600 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Lade...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Keine Aktivitäten
          </div>
        ) : (
          <div>
            {grouped.map(({ label, logs: groupLogs }) => (
              <div key={label}>
                {/* Day Header */}
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#1a1a1a] border-b border-[#222]">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-[10px] text-zinc-700 ml-1.5">({groupLogs.length})</span>
                </div>
                {/* Logs */}
                <div className="divide-y divide-[#1e1e1e]">
                  {groupLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 hover:bg-[#1e1e1e] transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getDotColor(log.action)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 leading-snug">
                            <span className="font-medium text-white truncate">
                              {log.entityName.length > 28
                                ? log.entityName.slice(0, 28) + "…"
                                : log.entityName}
                            </span>
                            {" "}
                            <span className="text-zinc-500">→</span>
                            {" "}
                            <span className="text-zinc-400">{getActionLabel(log.action)}</span>
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {formatRelativeTime(new Date(log.createdAt))}
                            {log.user && (
                              <> · <span className="text-zinc-500">{log.user.name}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
