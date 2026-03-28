"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface Kpis {
  totalRevenue: number;
  openAmount: number;
  overdueAmount: number;
  openCount: number;
  overdueCount: number;
  paidCount: number;
}

interface MonthlyEntry {
  month: string;
  amount: number;
}

interface TopProject {
  id: string;
  name: string;
  color: string;
  amount: number;
}

interface OpenItem {
  id: string;
  number: string;
  description: string | null;
  amount: number;
  status: string;
  dueDate: string;
  project: { id: string; name: string; color: string };
}

interface Summary {
  kpis: Kpis;
  monthlyRevenue: MonthlyEntry[];
  topProjects: TopProject[];
  openItems: OpenItem[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    PAID: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    OVERDUE: "bg-red-500/20 text-red-300 border border-red-500/30",
    CANCELLED: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  };
  const labels: Record<string, string> = {
    OPEN: "Offen",
    PAID: "Bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── SVG Liniendiagramm ───────────────────────────────────────────────────────
function LineChart({ data }: { data: MonthlyEntry[] }) {
  const W = 600;
  const H = 160;
  const pad = { top: 20, right: 20, bottom: 36, left: 60 };

  const maxVal = Math.max(...data.map((d) => d.amount), 1);

  const toX = (i: number) =>
    pad.left + (i / Math.max(data.length - 1, 1)) * (W - pad.left - pad.right);
  const toY = (v: number) =>
    pad.top + (1 - v / maxVal) * (H - pad.top - pad.bottom);

  const points = data.map((d, i) => `${toX(i)},${toY(d.amount)}`).join(" ");

  // Y-Achsen-Ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: toY(f * maxVal),
    label: formatEur(f * maxVal),
  }));

  // Monatslabels (kürzen: "2024-03" → "Mär 24")
  const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const xLabels = data.map((d, i) => {
    const [year, month] = d.month.split("-");
    return { x: toX(i), label: `${monthLabels[parseInt(month) - 1]} ${year.slice(2)}` };
  });

  // Area fill
  const areaPoints = [
    `${toX(0)},${H - pad.bottom}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.amount)}`),
    `${toX(data.length - 1)},${H - pad.bottom}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Hintergrund-Raster */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={pad.left} y1={tick.y} x2={W - pad.right} y2={tick.y}
            stroke="#27272a" strokeWidth="1" />
          <text x={pad.left - 6} y={tick.y + 4} textAnchor="end"
            className="fill-zinc-500" style={{ fontSize: 9 }}>
            {tick.label === "€0,00" ? "0" : tick.label}
          </text>
        </g>
      ))}

      {/* Area */}
      <polygon points={areaPoints} fill="url(#chartGradient)" />

      {/* Linie */}
      <polyline
        points={points}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Punkte */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.amount)} r="3"
          fill={d.amount > 0 ? "#10b981" : "#3f3f46"}
          stroke="#0f0f0f" strokeWidth="1.5"
        />
      ))}

      {/* X-Achse Labels — jedes zweite */}
      {xLabels.map((lbl, i) =>
        i % 2 === 0 ? (
          <text key={i} x={lbl.x} y={H - 6} textAnchor="middle"
            className="fill-zinc-500" style={{ fontSize: 9 }}>
            {lbl.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance/summary")
      .then((r) => r.json())
      .then((data) => { setSummary(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
        <div className="p-6 flex items-center justify-center h-64 text-zinc-500">
          Lade Finanzdaten…
        </div>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
        <div className="p-6 text-red-400">Fehler beim Laden der Finanzdaten.</div>
      </AppShell>
    );
  }

  const { kpis, monthlyRevenue, topProjects, openItems } = summary;

  return (
    <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Gesamtumsatz" value={formatEur(kpis.totalRevenue)} color="emerald" />
          <KpiCard label="Offen (Betrag)" value={formatEur(kpis.openAmount)} color="blue" />
          <KpiCard label="Überfällig (Betrag)" value={formatEur(kpis.overdueAmount)} color="red" />
          <KpiCard label="Offene Rechnungen" value={String(kpis.openCount)} color="blue" />
          <KpiCard label="Überfällige Rechnungen" value={String(kpis.overdueCount)} color="red" />
          <KpiCard label="Bezahlte Rechnungen" value={String(kpis.paidCount)} color="emerald" />
        </div>

        {/* Liniendiagramm */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">📈 Monatliche Einnahmen (letzte 12 Monate)</h2>
          {monthlyRevenue.length > 0 ? (
            <LineChart data={monthlyRevenue} />
          ) : (
            <p className="text-zinc-500 text-sm">Noch keine Einnahmen erfasst.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top-5 Projekte */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">🏆 Top-5 Projekte nach Umsatz</h2>
            {topProjects.length === 0 ? (
              <p className="text-zinc-500 text-sm">Keine Daten vorhanden.</p>
            ) : (
              <div className="space-y-3">
                {topProjects.map((p, i) => {
                  const maxAmt = topProjects[0].amount;
                  const pct = maxAmt > 0 ? (p.amount / maxAmt) * 100 : 0;
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between items-center mb-1">
                        <Link href={`/projects/${p.id}/finance`}
                          className="flex items-center gap-2 text-sm text-zinc-200 hover:text-white transition-colors">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: p.color }} />
                          <span className="truncate max-w-[180px]">{p.name}</span>
                        </Link>
                        <span className="text-xs text-emerald-400 font-mono font-medium">
                          {formatEur(p.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offene Posten */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">📋 Offene Posten</h2>
            {openItems.length === 0 ? (
              <p className="text-zinc-500 text-sm">Keine offenen Rechnungen. 🎉</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {openItems.map((item) => (
                  <div key={item.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.project.color }} />
                      <div className="min-w-0">
                        <Link href={`/projects/${item.project.id}/finance`}
                          className="text-xs font-medium text-zinc-200 hover:text-white block truncate">
                          {item.number}
                        </Link>
                        <span className="text-xs text-zinc-500 truncate block">
                          {item.project.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                      <span className="text-xs font-mono font-semibold text-zinc-200">
                        {formatEur(item.amount)}
                      </span>
                      {statusBadge(item.status)}
                      <span className="text-xs text-zinc-600">
                        Fällig: {new Date(item.dueDate).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "red" | "amber";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    red: "text-red-400",
    amber: "text-amber-400",
  };
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-lg font-bold font-mono ${colorMap[color]}`}>{value}</span>
    </div>
  );
}
