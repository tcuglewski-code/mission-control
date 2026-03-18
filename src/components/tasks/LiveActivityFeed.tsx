"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRelativeTime } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  createdAt: string;
  user?: { name: string; avatar?: string | null } | null;
}

function getDotColor(action: string): string {
  if (action === "completed" || action === "done") return "bg-emerald-500";
  if (action === "status_changed" || action === "updated") return "bg-orange-400";
  if (action === "created") return "bg-blue-400";
  if (action === "deleted") return "bg-red-400";
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
  };
  return labels[action] ?? action;
}

export function LiveActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=20");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch activity", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs font-semibold text-white">Live Aktivität</span>
        </div>
        <button
          onClick={fetchLogs}
          className="text-zinc-600 hover:text-zinc-300 text-[10px] transition-colors"
          title="Aktualisieren"
        >
          ↻
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Lade...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">
            Keine Aktivitäten
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {logs.map((log) => (
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
        )}
      </div>
    </div>
  );
}
