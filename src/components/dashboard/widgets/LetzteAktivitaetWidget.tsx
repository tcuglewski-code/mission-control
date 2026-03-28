import { Activity } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { formatRelativeTime, getActionLabel, getEntityTypeLabel, getInitials } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  createdAt: Date;
  user?: { name: string; avatar?: string | null } | null;
}

interface LetzteAktivitaetWidgetProps {
  logs: ActivityLog[];
}

const ENTITY_COLORS: Record<string, string> = {
  project: "bg-emerald-500/20 text-emerald-400",
  task: "bg-blue-500/20 text-blue-400",
  document: "bg-purple-500/20 text-purple-400",
  memory: "bg-purple-500/20 text-purple-400",
  tool: "bg-orange-500/20 text-orange-400",
  event: "bg-yellow-500/20 text-yellow-400",
};

export function LetzteAktivitaetWidget({ logs }: LetzteAktivitaetWidgetProps) {
  return (
    <WidgetShell
      title="Letzte Aktivität"
      icon={<Activity className="w-4 h-4 text-purple-400" />}
      badge={
        logs.length > 0 ? (
          <span className="text-xs text-zinc-600">{logs.length} Einträge</span>
        ) : undefined
      }
    >
      <div className="px-5 py-4">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-sm">Keine Aktivitäten</div>
        ) : (
          <div className="space-y-4">
            {logs.slice(0, 8).map((log, idx) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-semibold text-zinc-300 shrink-0">
                    {log.user ? getInitials(log.user.name) : "?"}
                  </div>
                  {idx < logs.slice(0, 8).length - 1 && (
                    <div className="w-px flex-1 bg-[#2a2a2a] mt-1 min-h-[1rem]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
                    <span className="font-medium text-white">
                      {log.user?.name ?? "System"}
                    </span>
                    <span className="text-zinc-500">{getActionLabel(log.action)}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ENTITY_COLORS[log.entityType] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {getEntityTypeLabel(log.entityType)}
                    </span>
                    <span className="text-white font-medium truncate max-w-[140px]">
                      {log.entityName}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    {formatRelativeTime(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
