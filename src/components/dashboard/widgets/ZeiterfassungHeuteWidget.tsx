import { Timer, Clock } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface TimeEntry {
  id: string;
  description?: string | null;
  duration?: number | null;
  startTime: Date;
  endTime?: Date | null;
  task: { title: string; project?: { name: string; color: string } | null };
}

interface ZeiterfassungHeuteWidgetProps {
  entries: TimeEntry[];
  totalMinutes: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function ZeiterfassungHeuteWidget({
  entries,
  totalMinutes,
}: ZeiterfassungHeuteWidgetProps) {
  return (
    <WidgetShell
      title="Zeiterfassung Heute"
      icon={<Timer className="w-4 h-4 text-cyan-400" />}
      href="/time"
      badge={
        totalMinutes > 0 ? (
          <span className="text-xs font-semibold text-cyan-400">
            {formatMinutes(totalMinutes)}
          </span>
        ) : undefined
      }
    >
      <div className="divide-y divide-[#222]">
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Noch keine Zeiteinträge heute
          </div>
        ) : (
          entries.slice(0, 5).map((entry) => {
            const dur = entry.duration ?? 0;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-1">
                    {entry.description ?? entry.task.title}
                  </p>
                  {entry.task.project && (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: entry.task.project.color }}
                      />
                      {entry.task.project.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  {dur > 0 ? formatMinutes(dur) : "Läuft..."}
                </div>
              </div>
            );
          })
        )}
      </div>
      {totalMinutes > 0 && (
        <div className="px-5 py-3 border-t border-[#222] flex items-center justify-between">
          <span className="text-xs text-zinc-500">Gesamt heute</span>
          <span className="text-xs font-semibold text-cyan-400">
            {formatMinutes(totalMinutes)}
          </span>
        </div>
      )}
    </WidgetShell>
  );
}
