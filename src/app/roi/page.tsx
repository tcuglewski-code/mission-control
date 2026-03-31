"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  Bot,
  Layers,
  Plus,
  X,
  Save,
  BarChart3,
} from "lucide-react";

interface SummaryData {
  totalTasks: number;
  totalManualHours: number;
  totalAgentHours: number;
  totalSavedHours: number;
  totalCostUsd: number;
  totalCostEur: number;
  totalSavedEur: number;
  roiPercent: number;
  efficiencyFactor: number;
  avgHourlyRate: number;
}

interface CategoryData {
  category: string;
  tasks: number;
  savedHours: number;
  costUsd: number;
  agentMinutes: number;
}

interface AgentData {
  agentName: string;
  tasks: number;
  savedHours: number;
  costUsd: number;
  agentMinutes: number;
}

interface DayData {
  date: string;
  tasks: number;
  savedHours: number;
  costUsd: number;
}

interface TaskData {
  id: string;
  taskTitle: string;
  category: string;
  agentName: string;
  estimatedManualHours: number;
  actualAgentMinutes: number;
  savedHours: number;
  costUsd: number;
  projectName: string | null;
  completedAt: string;
}

interface RoiData {
  summary: SummaryData;
  byCategory: CategoryData[];
  byAgent: AgentData[];
  byDay: DayData[];
  recentTasks: TaskData[];
}

const CATEGORY_LABELS: Record<string, string> = {
  code: "Code & Entwicklung",
  research: "Research & Analyse",
  content: "Content & Texte",
  qa: "QA & Testing",
  devops: "DevOps & Infra",
  design: "Design & UX",
  other: "Sonstiges",
};

const CATEGORY_COLORS: Record<string, string> = {
  code: "#22c55e",      // green
  research: "#3b82f6",  // blue
  content: "#f59e0b",   // amber
  qa: "#ef4444",        // red
  devops: "#8b5cf6",    // violet
  design: "#ec4899",    // pink
  other: "#6b7280",     // gray
};

function formatHours(hours: number): string {
  if (hours >= 100) return `${Math.round(hours)}h`;
  if (hours >= 10) return `${hours.toFixed(1)}h`;
  return `${hours.toFixed(2)}h`;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }
  return `${Math.round(minutes)}m`;
}

export default function RoiPage() {
  const [data, setData] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskDescription: "",
    category: "code",
    agentName: "Amadeus",
    estimatedManualHours: "",
    actualAgentMinutes: "",
    costUsd: "",
    hourlyRateSaved: "75",
    projectName: "",
    notes: "",
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ai/roi?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/ai/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedManualHours: parseFloat(formData.estimatedManualHours),
          actualAgentMinutes: parseFloat(formData.actualAgentMinutes),
          costUsd: parseFloat(formData.costUsd) || 0,
          hourlyRateSaved: parseFloat(formData.hourlyRateSaved) || 75,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          taskTitle: "",
          taskDescription: "",
          category: "code",
          agentName: "Amadeus",
          estimatedManualHours: "",
          actualAgentMinutes: "",
          costUsd: "",
          hourlyRateSaved: "75",
          projectName: "",
          notes: "",
        });
        // Reload data
        const newData = await fetch(`/api/ai/roi?period=${period}`).then((r) =>
          r.json()
        );
        setData(newData);
      }
    } finally {
      setSaving(false);
    }
  };

  // SVG Bar Chart für Kategorien
  const maxSavedHours =
    data?.byCategory.reduce((max, c) => Math.max(max, c.savedHours), 0) || 1;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#d4af37]" />
            KI-Agenten ROI Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Eingesparte Stunden und Kosten durch autonome Agenten
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="all">Gesamt</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#c5a030] text-[#1a2410] px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Task hinzufügen
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#3d5a27] border-t-[#d4af37] rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">
          Keine ROI-Daten verfügbar
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Eingesparte Stunden"
              value={formatHours(data.summary.totalSavedHours)}
              subtext={`von ${formatHours(data.summary.totalManualHours)} manuell`}
              color="#22c55e"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Einsparung (€)"
              value={`€${data.summary.totalSavedEur.toLocaleString("de-DE")}`}
              subtext={`bei €${data.summary.avgHourlyRate}/h Stundensatz`}
              color="#d4af37"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="ROI"
              value={`${data.summary.roiPercent > 0 ? "+" : ""}${data.summary.roiPercent}%`}
              subtext={`API-Kosten: $${data.summary.totalCostUsd.toFixed(2)}`}
              color={data.summary.roiPercent > 0 ? "#22c55e" : "#ef4444"}
            />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label="Effizienzfaktor"
              value={`${data.summary.efficiencyFactor}x`}
              subtext={`${data.summary.totalTasks} Tasks abgeschlossen`}
              color="#3b82f6"
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="bg-[#243318] rounded-xl p-6 border border-[#3d5a27]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#d4af37]" />
                Eingesparte Stunden nach Kategorie
              </h3>
              {data.byCategory.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  Keine Daten
                </div>
              ) : (
                <svg viewBox="0 0 400 200" className="w-full h-48">
                  {data.byCategory.map((cat, idx) => {
                    const barWidth = 40;
                    const gap = 20;
                    const x =
                      (400 - data.byCategory.length * (barWidth + gap)) / 2 +
                      idx * (barWidth + gap);
                    const barHeight = (cat.savedHours / maxSavedHours) * 140;
                    const y = 160 - barHeight;
                    const color = CATEGORY_COLORS[cat.category] || "#6b7280";

                    return (
                      <g key={cat.category}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill={color}
                          rx={4}
                          className="transition-all duration-300"
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 8}
                          textAnchor="middle"
                          className="fill-white text-xs font-medium"
                        >
                          {formatHours(cat.savedHours)}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={180}
                          textAnchor="middle"
                          className="fill-gray-400 text-[10px]"
                        >
                          {CATEGORY_LABELS[cat.category]?.split(" ")[0] ||
                            cat.category}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={193}
                          textAnchor="middle"
                          className="fill-gray-500 text-[9px]"
                        >
                          {cat.tasks} Tasks
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* By Agent */}
            <div className="bg-[#243318] rounded-xl p-6 border border-[#3d5a27]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#d4af37]" />
                Leistung nach Agent
              </h3>
              {data.byAgent.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  Keine Daten
                </div>
              ) : (
                <div className="space-y-4">
                  {data.byAgent.map((agent) => {
                    const maxAgentHours = Math.max(
                      ...data.byAgent.map((a) => a.savedHours)
                    );
                    const percent =
                      maxAgentHours > 0
                        ? (agent.savedHours / maxAgentHours) * 100
                        : 0;

                    return (
                      <div key={agent.agentName} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                            {agent.agentName}
                          </span>
                          <span className="text-gray-400">
                            {formatHours(agent.savedHours)} gespart ·{" "}
                            {agent.tasks} Tasks
                          </span>
                        </div>
                        <div className="h-3 bg-[#1a2410] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#3d5a27] to-[#d4af37] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Agenten-Zeit: {formatMinutes(agent.agentMinutes)}
                          </span>
                          <span>API-Kosten: ${agent.costUsd.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          {data.byDay.length > 1 && (
            <div className="bg-[#243318] rounded-xl p-6 border border-[#3d5a27]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#d4af37]" />
                Trend: Eingesparte Stunden pro Tag
              </h3>
              <svg viewBox="0 0 800 150" className="w-full h-32">
                {(() => {
                  const maxDayHours = Math.max(
                    ...data.byDay.map((d) => d.savedHours)
                  );
                  const barWidth = Math.min(
                    30,
                    (800 - 40) / data.byDay.length - 4
                  );
                  const startX = 20;

                  return data.byDay.map((day, idx) => {
                    const barHeight =
                      maxDayHours > 0 ? (day.savedHours / maxDayHours) * 100 : 0;
                    const x = startX + idx * (barWidth + 4);
                    const y = 120 - barHeight;

                    return (
                      <g key={day.date}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill="#3d5a27"
                          rx={2}
                          className="hover:fill-[#d4af37] transition-colors"
                        />
                        {idx % Math.ceil(data.byDay.length / 10) === 0 && (
                          <text
                            x={x + barWidth / 2}
                            y={140}
                            textAnchor="middle"
                            className="fill-gray-500 text-[8px]"
                          >
                            {day.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
          )}

          {/* Recent Tasks Table */}
          <div className="bg-[#243318] rounded-xl border border-[#3d5a27] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#3d5a27]">
              <h3 className="text-lg font-semibold text-white">
                Letzte Agenten-Tasks
              </h3>
            </div>
            {data.recentTasks.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                Noch keine Tasks erfasst
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1a2410]">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        Task
                      </th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        Kategorie
                      </th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        Agent
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        Manuell
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        Agent
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        Gespart
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        Kosten
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        Datum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d5a27]">
                    {data.recentTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-[#2d3f1e] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-xs">
                            {task.taskTitle}
                          </div>
                          {task.projectName && (
                            <div className="text-gray-500 text-xs">
                              {task.projectName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[task.category] || "#6b7280"}20`,
                              color: CATEGORY_COLORS[task.category] || "#6b7280",
                            }}
                          >
                            {CATEGORY_LABELS[task.category] || task.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {task.agentName}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {formatHours(task.estimatedManualHours)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {formatMinutes(task.actualAgentMinutes)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              task.savedHours > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {task.savedHours > 0 ? "+" : ""}
                            {formatHours(task.savedHours)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          ${task.costUsd.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {new Date(task.completedAt).toLocaleDateString(
                            "de-DE"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2410] rounded-xl border border-[#3d5a27] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#3d5a27]">
              <h2 className="text-lg font-semibold text-white">
                Agenten-Task erfassen
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Task-Titel *
                </label>
                <input
                  type="text"
                  value={formData.taskTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, taskTitle: e.target.value })
                  }
                  className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="z.B. API-Endpoint implementieren"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    <option value="code">Code & Entwicklung</option>
                    <option value="research">Research & Analyse</option>
                    <option value="content">Content & Texte</option>
                    <option value="qa">QA & Testing</option>
                    <option value="devops">DevOps & Infra</option>
                    <option value="design">Design & UX</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Agent
                  </label>
                  <input
                    type="text"
                    value={formData.agentName}
                    onChange={(e) =>
                      setFormData({ ...formData, agentName: e.target.value })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="z.B. Amadeus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Manuelle Zeit (Stunden) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.estimatedManualHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedManualHours: e.target.value,
                      })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="z.B. 4"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wie lange hätte ein Mensch gebraucht?
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Agenten-Zeit (Minuten) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.actualAgentMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actualAgentMinutes: e.target.value,
                      })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="z.B. 15"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wie lange hat der Agent gebraucht?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    API-Kosten (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, costUsd: e.target.value })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="z.B. 0.50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Stundensatz (€/h)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={formData.hourlyRateSaved}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hourlyRateSaved: e.target.value,
                      })
                    }
                    className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Projekt (optional)
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData({ ...formData, projectName: e.target.value })
                  }
                  className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="z.B. Mission Control"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Notizen (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full bg-[#243318] border border-[#3d5a27] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none"
                  rows={2}
                  placeholder="Zusätzliche Infos..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#c5a030] text-[#1a2410] px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-[#243318] rounded-xl p-4 border border-[#3d5a27]">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtext}</div>
    </div>
  );
}
