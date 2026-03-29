"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Euro, AlertTriangle, TrendingUp } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface BudgetProject {
  id: string;
  name: string;
  color: string;
  budget: number;
  budgetUsed: number;
  pct: number;
  status: string;
}

function formatEuro(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

export function ProjektBudgetsWidget() {
  const [projects, setProjects] = useState<BudgetProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects/budgets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const overCount = projects.filter((p) => p.pct >= 100).length;
  const warnCount = projects.filter((p) => p.pct >= 80 && p.pct < 100).length;

  return (
    <WidgetShell
      title="Projekt-Budgets"
      icon={<TrendingUp className="w-4 h-4 text-zinc-400" />}
      href="/projects"
      badge={
        overCount > 0 ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[11px] text-red-400 font-semibold">{overCount} über Budget</span>
          </div>
        ) : warnCount > 0 ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="text-[11px] text-yellow-400 font-semibold">{warnCount} Warnung</span>
          </div>
        ) : undefined
      }
    >
      <div className="px-5 py-4">
        {loading ? (
          <div className="py-6 text-center text-zinc-600 text-xs">Laden…</div>
        ) : projects.length === 0 ? (
          <div className="py-6 text-center text-zinc-600 text-sm">
            Keine Budget-Daten verfügbar
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => {
              const barColor =
                p.pct < 80 ? "bg-emerald-500" : p.pct < 100 ? "bg-yellow-500" : "bg-red-500";
              const textColor =
                p.pct < 80 ? "text-zinc-500" : p.pct < 100 ? "text-yellow-400" : "text-red-400";
              return (
                <Link key={p.id} href={`/projects/${p.id}/costs`} className="block group">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-[11px] text-zinc-300 flex-1 truncate group-hover:text-white transition-colors">
                      {p.name}
                    </span>
                    {p.pct >= 80 && (
                      <AlertTriangle
                        className={`w-3 h-3 shrink-0 ${p.pct >= 100 ? "text-red-400" : "text-yellow-400"}`}
                      />
                    )}
                    <span className={`text-[11px] font-semibold shrink-0 ${textColor}`}>
                      {p.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden ml-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, p.pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between ml-3 mt-0.5">
                    <span className="text-[10px] text-zinc-600">
                      Ist: €&nbsp;{formatEuro(p.budgetUsed ?? 0)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      Soll: €&nbsp;{formatEuro(p.budget)}
                    </span>
                  </div>
                </Link>
              );
            })}
            <div className="pt-1 text-center">
              <Link
                href="/projects"
                className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Alle Projekte →
              </Link>
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
