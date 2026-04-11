"use client";

import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface WorkerResult {
  id: string;
  taskName: string;
  runTs: Date | string;
  status: string;
  summary?: string | null;
  domain?: string | null;
  severity: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "error":
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Activity className="w-4 h-4 text-zinc-500" />;
  }
};

const severityBadge = (severity: string) => {
  const colors: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    critical: "bg-red-600/20 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[severity] || colors.info}`}
    >
      {severity}
    </span>
  );
};

export function SystemHealthWidget({ results }: { results: WorkerResult[] }) {
  const hasResults = results.length > 0;
  const errorCount = results.filter(
    (r) => r.status === "error" || r.severity === "critical"
  ).length;
  const warningCount = results.filter(
    (r) => r.status === "warning" || r.severity === "warning"
  ).length;

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white text-sm">System Health</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {errorCount > 0 && (
            <span className="text-red-400">{errorCount} Fehler</span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-400">{warningCount} Warnungen</span>
          )}
          {errorCount === 0 && warningCount === 0 && hasResults && (
            <span className="text-emerald-400">Alles OK</span>
          )}
        </div>
      </div>

      {!hasResults ? (
        <p className="text-zinc-600 text-sm text-center py-4">
          Noch keine Worker-Ergebnisse vorhanden
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-[#1c1c1c] border border-[#2a2a2a]"
            >
              <div className="mt-0.5">{statusIcon(r.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {r.taskName}
                  </span>
                  {severityBadge(r.severity)}
                </div>
                {r.summary && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                    {r.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                  {r.domain && <span>{r.domain}</span>}
                  <span>
                    {formatDistanceToNow(new Date(r.runTs), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
