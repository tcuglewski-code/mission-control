import Link from "next/link";
import { Euro, AlertTriangle } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface Project {
  id: string;
  name: string;
  budget: number | null;
  budgetUsed: number | null;
  color: string;
}

interface BudgetUebersichtWidgetProps {
  projects: Project[];
}

function formatEuro(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function BudgetUebersichtWidget({ projects }: BudgetUebersichtWidgetProps) {
  const withBudget = projects.filter((p) => p.budget != null && p.budget > 0);
  const totalBudget = withBudget.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalUsed = withBudget.reduce((s, p) => s + (p.budgetUsed ?? 0), 0);
  const overCount = withBudget.filter((p) => (p.budgetUsed ?? 0) > (p.budget ?? 0)).length;
  const totalPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalUsed / totalBudget) * 100)) : 0;
  const barColor =
    totalPct < 70 ? "bg-emerald-500" : totalPct < 90 ? "bg-yellow-500" : "bg-red-500";

  if (withBudget.length === 0) {
    return (
      <WidgetShell
        title="Budget-Übersicht"
        icon={<Euro className="w-4 h-4 text-zinc-400" />}
      >
        <div className="px-5 py-8 text-center text-zinc-600 text-sm">
          Keine Budget-Daten verfügbar
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Budget-Übersicht"
      icon={<Euro className="w-4 h-4 text-zinc-400" />}
      href="/projects"
      badge={
        overCount > 0 ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[11px] text-red-400 font-semibold">{overCount} über Budget</span>
          </div>
        ) : undefined
      }
    >
      <div className="px-5 py-4 space-y-4">
        {/* Gesamt */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Gesamt</span>
            <span className="text-white font-semibold">
              €&nbsp;{formatEuro(totalUsed)} / €&nbsp;{formatEuro(totalBudget)}
            </span>
          </div>
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${totalPct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-600">
            <span>{totalPct}% verbraucht</span>
            <span>€&nbsp;{formatEuro(totalBudget - totalUsed)} übrig</span>
          </div>
        </div>

        {/* Per-Project */}
        <div className="space-y-2">
          {withBudget.slice(0, 4).map((p) => {
            const pct = p.budget
              ? Math.min(100, Math.round(((p.budgetUsed ?? 0) / p.budget) * 100))
              : 0;
            const pColor =
              pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-yellow-500" : "bg-red-500";
            const isOver = (p.budgetUsed ?? 0) > (p.budget ?? 0);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-[11px] text-zinc-400 flex-1 truncate">{p.name}</span>
                {isOver && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span
                  className={`text-[11px] w-8 text-right ${isOver ? "text-red-400" : "text-zinc-500"}`}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}
