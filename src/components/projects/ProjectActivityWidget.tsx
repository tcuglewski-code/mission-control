"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { formatRelativeTime, getActionLabel } from "@/lib/utils";
import Link from "next/link";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  createdAt: string;
  user?: { name: string; avatar?: string | null } | null;
}

interface Props {
  projectId: string;
  /** Vorgeladene Einträge vom Server (SSR) */
  initialLogs?: ActivityLog[];
}

function getDotColor(action: string): string {
  if (action === "completed" || action === "done" || action === "status_changed") return "bg-emerald-500";
  if (action === "updated") return "bg-orange-400";
  if (action === "created") return "bg-blue-400";
  if (action === "deleted") return "bg-red-400";
  if (action === "commented") return "bg-purple-400";
  if (action === "reaction") return "bg-pink-400";
  return "bg-zinc-500";
}

export function ProjectActivityWidget({ projectId, initialLogs = [] }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [loading, setLoading] = useState(initialLogs.length === 0);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/activity?projectId=${projectId}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (initialLogs.length === 0) {
      fetchLogs();
    }
  }, [fetchLogs, initialLogs.length]);

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Letzte Aktivitäten</h2>
        </div>
        <Link
          href={`/activity?projectId=${projectId}`}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          Alle anzeigen
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-[#252525] rounded animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-zinc-600 italic text-center py-4">
          Noch keine Aktivitäten
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getDotColor(log.action)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-snug">
                  <span className="font-medium text-white">
                    {log.entityName.length > 30
                      ? log.entityName.slice(0, 30) + "…"
                      : log.entityName}
                  </span>
                  {" "}
                  <span className="text-zinc-500">{getActionLabel(log.action)}</span>
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {formatRelativeTime(log.createdAt)}
                  {log.user && (
                    <> · <span className="text-zinc-500">{log.user.name}</span></>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length >= 5 && (
        <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
          <Link
            href={`/activity?projectId=${projectId}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            Vollständige Timeline
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
