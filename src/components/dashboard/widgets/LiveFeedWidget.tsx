"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Activity, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  createdAt: string;
  user?: { name: string; avatar?: string | null } | null;
  project?: { name: string; color: string } | null;
}

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
};

export function LiveFeedWidget() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=5");
      if (res.ok) {
        const data = await res.json();
        const newLogs: ActivityLog[] = data.logs ?? [];

        // Neue IDs erkennen für Highlight-Effekt
        setLogs((prev) => {
          const prevIds = new Set(prev.map((l) => l.id));
          const fresh = new Set(newLogs.filter((l) => !prevIds.has(l.id)).map((l) => l.id));
          if (fresh.size > 0) {
            setFreshIds(fresh);
            setTimeout(() => setFreshIds(new Set()), 3000);
          }
          return newLogs;
        });

        setLastUpdate(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Live Feed</h3>
          <span className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-emerald-500">live</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
            title="Aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/live"
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
            title="Live Dashboard öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Feed */}
      <div className="divide-y divide-[#222]">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-zinc-600 text-xs gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Lade…
          </div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-zinc-600 text-xs">
            Noch keine Aktivitäten
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-all duration-500",
                freshIds.has(log.id)
                  ? "bg-emerald-500/5 border-l-2 border-emerald-500/50"
                  : "hover:bg-[#1e1e1e]"
              )}
            >
              <span className="text-base mt-0.5 shrink-0">
                {ACTION_ICONS[log.action] ?? "•"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-snug">
                  <span className="font-medium text-white">
                    {log.entityName.length > 28
                      ? log.entityName.slice(0, 28) + "…"
                      : log.entityName}
                  </span>{" "}
                  <span className="text-zinc-500">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {log.user && (
                    <span className="text-[10px] text-zinc-500">{log.user.name}</span>
                  )}
                  {log.project && (
                    <span
                      className="text-[10px] text-zinc-500 px-1 rounded"
                      style={{ borderLeft: `2px solid ${log.project.color}` }}
                    >
                      {log.project.name.length > 15
                        ? log.project.name.slice(0, 15) + "…"
                        : log.project.name}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-700">
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

      {/* Footer */}
      {lastUpdate && (
        <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center justify-between">
          <span className="text-[10px] text-zinc-700">
            Auto-Update alle 30s
          </span>
          <Link
            href="/live"
            className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            Live Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}
