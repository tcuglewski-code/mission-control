"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Euro, TrendingUp, Clock, AlertTriangle, X, Check } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface ProjectCost {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
}

interface TimeEntry {
  id: string;
  duration: number | null;
  task: {
    id: string;
    title: string;
    assignee: { id: string; name: string; hourlyRate: number } | null;
  };
}

interface Project {
  id: string;
  name: string;
  budget: number | null;
  budgetUsed: number | null;
  color: string;
}

const CATEGORIES = ["Material", "Personal", "Fahrtkosten", "Sonstiges"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<Category, string> = {
  Material: "#3b82f6",
  Personal: "#8b5cf6",
  Fahrtkosten: "#f59e0b",
  Sonstiges: "#6b7280",
};

function formatEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Donut-Chart SVG ──────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const size = 140;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const startOffset = offset;
      offset += dash;
      return { ...d, dash, gap, startOffset };
    });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Hintergrundkreis */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth={22} />
        {slices.map((slice, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth={20}
            strokeDasharray={`${slice.dash} ${slice.gap}`}
            strokeDashoffset={-slice.startOffset + circumference / 4}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.3s" }}
          />
        ))}
        {/* Mittelbeschriftung */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
          €{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#71717a" fontSize="9">
          Gesamt
        </text>
      </svg>
      {/* Legende */}
      <div className="space-y-1 w-full">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="text-zinc-400">{slice.label}</span>
            </div>
            <span className="text-white font-medium">€ {formatEur(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function ProjectCostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [costs, setCosts] = useState<ProjectCost[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Formular
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<Category>("Material");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`);
      if (!res.ok) return;
      const data = await res.json();
      setProject(data.project);
      setCosts(data.costs);
      setTimeEntries(data.timeEntries);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddCost(e: React.FormEvent) {
    e.preventDefault();
    if (!formAmount) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          amount: parseFloat(formAmount.replace(",", ".")),
          description: formDesc || null,
          date: formDate,
        }),
      });
      if (res.ok) {
        setFormAmount("");
        setFormDesc("");
        setFormDate(new Date().toISOString().slice(0, 10));
        setShowForm(false);
        loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(costId: string) {
    if (!confirm("Kostenposition löschen?")) return;
    await fetch(`/api/projects/${projectId}/costs/${costId}`, { method: "DELETE" });
    loadData();
  }

  // ─── Berechnungen ────────────────────────────────────────────────────────
  const totalManual = costs.reduce((s, c) => s + c.amount, 0);

  // Personalkosten aus Zeiterfassung
  const laborCosts = timeEntries.reduce((s, te) => {
    const rate = te.task.assignee?.hourlyRate ?? 0;
    const hours = (te.duration ?? 0) / 60;
    return s + hours * rate;
  }, 0);

  const totalCosts = totalManual + laborCosts;

  // Kategorien-Summen für Donut
  type ChartEntry = { label: string; value: number; color: string };
  const categorySums: ChartEntry[] = CATEGORIES.map((cat) => ({
    label: cat,
    value: costs.filter((c) => c.category === cat).reduce((s, c) => s + c.amount, 0),
    color: CATEGORY_COLORS[cat],
  }));
  if (laborCosts > 0) {
    categorySums.push({ label: "Zeiterfassung", value: laborCosts, color: "#ec4899" });
  }

  const budget = project?.budget ?? 0;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((totalCosts / budget) * 100)) : 0;
  const budgetBar =
    budgetPct < 80 ? "bg-emerald-500" : budgetPct < 100 ? "bg-yellow-500" : "bg-red-500";
  const budgetText =
    budgetPct < 80 ? "text-emerald-400" : budgetPct < 100 ? "text-yellow-400" : "text-red-400";

  if (loading) {
    return (
      <AppShell title="Kostenplanung">
        <div className="flex items-center justify-center h-64 text-zinc-500">Laden…</div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${project?.name ?? "Projekt"} — Kosten`}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </Link>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: project?.color ?? "#3b82f6" }}
            />
            <h1 className="text-lg font-semibold text-white">
              {project?.name} — Kostenplanung
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Kostenposition
          </button>
        </div>

        {/* Budget-Fortschrittsbalken */}
        {budget > 0 && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-white">Budget-Auslastung</span>
              </div>
              <span className={`text-sm font-bold ${budgetText}`}>
                {budgetPct}%
                {budgetPct >= 100 && (
                  <AlertTriangle className="inline w-4 h-4 ml-1 text-red-400" />
                )}
                {budgetPct >= 80 && budgetPct < 100 && (
                  <AlertTriangle className="inline w-4 h-4 ml-1 text-yellow-400" />
                )}
              </span>
            </div>
            <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${budgetBar}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Ist: <span className="text-white font-medium">€ {formatEur(totalCosts)}</span></span>
              <span>Soll: <span className="text-white font-medium">€ {formatEur(budget)}</span></span>
              <span>
                Verbleibend:{" "}
                <span className={budget - totalCosts >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {budget - totalCosts >= 0 ? "€ " : "– €"}{formatEur(Math.abs(budget - totalCosts))}
                </span>
              </span>
            </div>
            {budgetPct >= 80 && budgetPct < 100 && (
              <p className="text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-1.5">
                ⚠️ Über 80 % des Budgets verbraucht — Vorsicht!
              </p>
            )}
            {budgetPct >= 100 && (
              <p className="text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">
                🚨 Budget überschritten!
              </p>
            )}
          </div>
        )}

        {/* Neue Kostenposition Form */}
        {showForm && (
          <div className="bg-[#1c1c1c] border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Neue Kostenposition</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCost} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Kategorie */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-zinc-500 block mb-1">Kategorie</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as Category)}
                  className="w-full text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Betrag */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Betrag (€)</label>
                <input
                  type="text"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="w-full text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* Datum */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Datum</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* Beschreibung */}
              <div className="col-span-2 sm:col-span-4">
                <label className="text-xs text-zinc-500 block mb-1">Beschreibung (optional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="z.B. Setzlinge Eiche, Lieferant Müller"
                  className="w-full text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2 sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Speichern…" : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Übersicht Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Donut Chart */}
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              Kosten nach Kategorie
            </h2>
            {totalCosts > 0 ? (
              <DonutChart data={categorySums.filter((c) => c.value > 0)} />
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">Noch keine Kostenpositionen</p>
            )}
          </div>

          {/* Zusammenfassung */}
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Euro className="w-4 h-4 text-zinc-400" />
              Kostenübersicht
            </h2>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const sum = costs.filter((c) => c.category === cat).reduce((s, c) => s + c.amount, 0);
                return (
                  <div key={cat} className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                      <span className="text-zinc-400">{cat}</span>
                    </div>
                    <span className="text-white font-medium">€ {formatEur(sum)}</span>
                  </div>
                );
              })}
              {laborCosts > 0 && (
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                    <span className="text-zinc-400">Personal (Zeiterfassung)</span>
                  </div>
                  <span className="text-white font-medium">€ {formatEur(laborCosts)}</span>
                </div>
              )}
              <div className="border-t border-[#2a2a2a] pt-2 flex justify-between text-xs font-semibold">
                <span className="text-zinc-300">Gesamt</span>
                <span className="text-white">€ {formatEur(totalCosts)}</span>
              </div>
              {budget > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Geplant</span>
                  <span className="text-zinc-300">€ {formatEur(budget)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Zeiterfassung Personalkosten */}
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-zinc-400" />
              Personalkosten aus Zeiterfassung
            </h2>
            {timeEntries.filter((te) => (te.task.assignee?.hourlyRate ?? 0) > 0).length === 0 ? (
              <p className="text-xs text-zinc-600">
                Keine Zeiteinträge mit Stundensatz. Stundensatz im Profil festlegen.
              </p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(
                  timeEntries
                    .filter((te) => (te.task.assignee?.hourlyRate ?? 0) > 0)
                    .reduce((acc: Record<string, { name: string; hours: number; rate: number }>, te) => {
                      const key = te.task.assignee?.id ?? "unknown";
                      if (!acc[key]) {
                        acc[key] = {
                          name: te.task.assignee?.name ?? "Unbekannt",
                          hours: 0,
                          rate: te.task.assignee?.hourlyRate ?? 0,
                        };
                      }
                      acc[key].hours += (te.duration ?? 0) / 60;
                      return acc;
                    }, {})
                ).map(([key, data]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <div>
                      <span className="text-zinc-300">{data.name}</span>
                      <span className="text-zinc-600 ml-1">
                        ({data.hours.toFixed(1)}h × €{data.rate}/h)
                      </span>
                    </div>
                    <span className="text-white font-medium">€ {formatEur(data.hours * data.rate)}</span>
                  </div>
                ))}
                <div className="border-t border-[#2a2a2a] pt-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-zinc-300">Summe Personal</span>
                  <span className="text-pink-400">€ {formatEur(laborCosts)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kostenpositionen Liste */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Kostenpositionen</h2>
            <span className="text-xs text-zinc-500">{costs.length} Einträge</span>
          </div>
          {costs.length === 0 ? (
            <div className="px-5 py-10 text-center text-zinc-600 text-sm">
              Noch keine Kostenpositionen. Klick auf &quot;Neue Kostenposition&quot; um zu beginnen.
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {costs.map((cost) => (
                <div key={cost.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#252525] transition-colors">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cost.category as Category] ?? "#6b7280" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[cost.category as Category] ?? "#6b7280"}20`,
                          color: CATEGORY_COLORS[cost.category as Category] ?? "#9ca3af",
                        }}
                      >
                        {cost.category}
                      </span>
                      {cost.description && (
                        <span className="text-xs text-zinc-400 truncate">{cost.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-white">€ {formatEur(cost.amount)}</div>
                    <div className="text-[10px] text-zinc-600">{formatDate(cost.date)}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(cost.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
