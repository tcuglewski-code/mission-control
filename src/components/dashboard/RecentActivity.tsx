import { formatRelativeTime, getActionLabel, getEntityTypeLabel, getInitials } from "@/lib/utils";
import { Activity } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userId?: string | null;
  createdAt: Date;
  user?: { name: string; avatar?: string | null } | null;
}

interface RecentActivityProps {
  logs: ActivityLog[];
}

const entityTypeColors: Record<string, string> = {
  project: "bg-emerald-500/20 text-emerald-400",
  task: "bg-blue-500/20 text-blue-400",
  document: "bg-purple-500/20 text-purple-400",
  memory: "bg-purple-500/20 text-purple-400",
  tool: "bg-orange-500/20 text-orange-400",
  event: "bg-yellow-500/20 text-yellow-400",
};

export function RecentActivity({ logs }: RecentActivityProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Letzte Aktivitäten</h2>
        </div>
        <div className="text-center py-8 text-zinc-600 text-sm">Keine Aktivitäten</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Letzte Aktivitäten</h2>
        </div>
        <span className="text-xs text-zinc-600">{logs.length} Einträge</span>
      </div>

      <div className="space-y-4">
        {logs.map((log, idx) => (
          <div key={log.id} className="flex gap-3">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-semibold text-zinc-300 shrink-0">
                {log.user ? getInitials(log.user.name) : "?"}
              </div>
              {idx < logs.length - 1 && (
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
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    entityTypeColors[log.entityType] ?? "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {getEntityTypeLabel(log.entityType)}
                </span>
                <span className="text-white font-medium truncate max-w-[160px]">
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
    </div>
  );
}
