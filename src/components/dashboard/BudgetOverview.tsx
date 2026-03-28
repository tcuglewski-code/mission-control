import { Euro, TrendingUp, AlertTriangle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  budget: number | null;
  budgetUsed: number | null;
  color: string;
}

interface BudgetOverviewProps {
  projects: Project[];
}

function formatEuro(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function BudgetOverview({ projects }: BudgetOverviewProps) {
  const projectsWithBudget = projects.filter((p) => p.budget != null && p.budget > 0);

  const totalBudget = projectsWithBudget.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const totalUsed = projectsWithBudget.reduce((sum, p) => sum + (p.budgetUsed ?? 0), 0);
  const overBudgetCount = projectsWithBudget.filter(
    (p) => (p.budgetUsed ?? 0) > (p.budget ?? 0)
  ).length;

  const totalPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalUsed / totalBudget) * 100)) : 0;

  const barColor =
    totalPercent < 70
      ? "bg-emerald-500"
      : totalPercent < 90
      ? "bg-yellow-500"
      : "bg-red-500";

  if (projectsWithBudget.length === 0) return null;

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Budget-Übersicht</h2>
        </div>
        {overBudgetCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400 font-semibold">{overBudgetCount} über Budget</span>
          </div>
        )}
      </div>

      {/* Gesamt */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400">Gesamt verbraucht</span>
          <span className="text-white font-semibold">
            € {formatEuro(totalUsed)} / € {formatEuro(totalBudget)}
          </span>
        </div>
        <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${totalPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-600">
          <span>{totalPercent}% verbraucht</span>
          <span>€ {formatEuro(totalBudget - totalUsed)} verbleibend</span>
        </div>
      </div>

      {/* Projekte */}
      <div className="space-y-2">
        {projectsWithBudget.slice(0, 4).map((p) => {
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
                <div
                  className={`h-full rounded-full ${pColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-[11px] w-8 text-right ${isOver ? "text-red-400" : "text-zinc-500"}`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
