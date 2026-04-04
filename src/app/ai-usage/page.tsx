"use client";

import { useEffect, useState } from "react";
import { Brain, DollarSign, Hash, Zap, TrendingUp, AlertTriangle, Settings, Save, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface UsageData {
  totalTokens: number;
  totalCostUsd: number;
  byFeature: Array<{ feature: string; tokens: number; cost: number; calls: number }>;
  byModel: Array<{ model: string; tokens: number; cost: number; calls: number }>;
  byProject: Array<{ projectId: string; projectName: string; tokens: number; cost: number }>;
  byDay: Array<{ date: string; tokens: number; cost: number }>;
  bySource: {
    api: { tokens: number; cost: number };
    max: { tokens: number; cost: number };
  };
}

interface BudgetData {
  config: {
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    alertThreshold: number;
    alertEnabled: boolean;
    alertTelegram: boolean;
  };
  current: {
    daily: { cost: number; budget: number; percent: number; tokens: number; calls: number };
    monthly: { cost: number; budget: number; percent: number; tokens: number; calls: number };
  };
  alerts: {
    dailyWarning: boolean;
    monthlyWarning: boolean;
    dailyExceeded: boolean;
    monthlyExceeded: boolean;
  };
  telegramConfigured: boolean;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
}

const FEATURE_LABELS: Record<string, string> = {
  "sprint-tasks": "Sprint-Tasks generieren",
  "project-estimate": "Projekt-Schätzung",
  "task-description": "Task-Beschreibung",
  "project-summary": "Projekt-Summary",
  "foerderberater": "Förderberater",
  "amadeus-sprint": "Amadeus Sprint",
  "other": "Sonstiges",
};

export default function AiUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [source, setSource] = useState<"api" | "max" | "all">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 100,
    alertThreshold: 0.8,
    alertEnabled: true,
    alertTelegram: true,
  });

  // Fetch usage data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/ai/usage?period=${period}&source=${source}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period, source]);

  // Fetch budget data
  useEffect(() => {
    fetch("/api/ai/budget")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBudget(data);
          setSettingsForm({
            dailyBudgetUsd: data.config.dailyBudgetUsd,
            monthlyBudgetUsd: data.config.monthlyBudgetUsd,
            alertThreshold: data.config.alertThreshold,
            alertEnabled: data.config.alertEnabled,
            alertTelegram: data.config.alertTelegram,
          });
        }
      })
      .catch(console.error);
  }, []);

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/ai/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        const updated = await fetch("/api/ai/budget").then((r) => r.json());
        setBudget(updated);
        setShowSettings(false);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const totalCalls = data?.byFeature.reduce((sum, f) => sum + f.calls, 0) || 0;
  const avgCostPerCall = totalCalls > 0 ? (data?.totalCostUsd || 0) / totalCalls : 0;

  // Format chart data
  const chartData = (data?.byDay || []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    Kosten: Number(d.cost.toFixed(4)),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-emerald-400" />
            KI-Kosten Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Token-Verbrauch und Kosten der KI-Features
          </p>
        </div>

        {/* Filters + Settings */}
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "7d" | "30d" | "90d" | "all")}
            className="px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="all">Gesamt</option>
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "api" | "max" | "all")}
            className="px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Alle Quellen</option>
            <option value="api">Nur API</option>
            <option value="max">Nur Max/Amadeus</option>
          </select>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#2a2a2a] transition-colors"
            title="Budget-Einstellungen"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budget?.alerts && (budget.alerts.dailyWarning || budget.alerts.monthlyWarning) && (
        <div className={`rounded-xl p-4 border ${
          budget.alerts.dailyExceeded || budget.alerts.monthlyExceeded
            ? "bg-red-500/10 border-red-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              budget.alerts.dailyExceeded || budget.alerts.monthlyExceeded
                ? "text-red-400"
                : "text-amber-400"
            }`} />
            <div>
              <p className={`font-medium ${
                budget.alerts.dailyExceeded || budget.alerts.monthlyExceeded
                  ? "text-red-400"
                  : "text-amber-400"
              }`}>
                {budget.alerts.dailyExceeded || budget.alerts.monthlyExceeded
                  ? "Budget überschritten!"
                  : "Budget-Warnung"}
              </p>
              <div className="text-sm text-zinc-300 mt-1 space-y-1">
                {budget.alerts.dailyWarning && (
                  <p>
                    Heute: ${budget.current.daily.cost.toFixed(2)} / ${budget.current.daily.budget.toFixed(2)} 
                    ({budget.current.daily.percent}%)
                  </p>
                )}
                {budget.alerts.monthlyWarning && (
                  <p>
                    Dieser Monat: ${budget.current.monthly.cost.toFixed(2)} / ${budget.current.monthly.budget.toFixed(2)} 
                    ({budget.current.monthly.percent}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Budget-Einstellungen</h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tagesbudget (USD)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={settingsForm.dailyBudgetUsd}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dailyBudgetUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Monatsbudget (USD)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  value={settingsForm.monthlyBudgetUsd}
                  onChange={(e) => setSettingsForm({ ...settingsForm, monthlyBudgetUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Warn-Schwelle (%)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  value={Math.round(settingsForm.alertThreshold * 100)}
                  onChange={(e) => setSettingsForm({ ...settingsForm, alertThreshold: (parseFloat(e.target.value) || 80) / 100 })}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alertEnabled"
                  checked={settingsForm.alertEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, alertEnabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0f0f0f] border-[#2a2a2a]"
                />
                <label htmlFor="alertEnabled" className="text-sm text-zinc-300">Alerts aktiviert</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alertTelegram"
                  checked={settingsForm.alertTelegram}
                  onChange={(e) => setSettingsForm({ ...settingsForm, alertTelegram: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0f0f0f] border-[#2a2a2a]"
                />
                <label htmlFor="alertTelegram" className="text-sm text-zinc-300">
                  Telegram-Benachrichtigung
                  {budget && !budget.telegramConfigured && (
                    <span className="text-amber-400 text-xs ml-2">(nicht konfiguriert)</span>
                  )}
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-white hover:bg-[#3a3a3a]"
              >
                Abbrechen
              </button>
              <button
                onClick={saveSettings}
                disabled={settingsLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {settingsLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-zinc-500">
          Keine Daten verfügbar
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Gesamt-Kosten
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCost(data.totalCostUsd)}
              </p>
            </div>
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <Hash className="w-4 h-4" />
                Tokens
              </div>
              <p className="text-2xl font-bold text-white">
                {formatTokens(data.totalTokens)}
              </p>
            </div>
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <Zap className="w-4 h-4" />
                API-Calls
              </div>
              <p className="text-2xl font-bold text-white">{totalCalls}</p>
            </div>
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Ø pro Call
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCost(avgCostPerCall)}
              </p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Tägliche Kosten
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: "#888", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: "#888", fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1c1c",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#888" }}
                    formatter={(value) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [`$${numValue.toFixed(4)}`, "Kosten"];
                    }}
                  />
                  <Bar dataKey="Kosten" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tables */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* By Feature */}
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Nach Feature
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-[#2a2a2a]">
                      <th className="pb-2">Feature</th>
                      <th className="pb-2 text-right">Calls</th>
                      <th className="pb-2 text-right">Tokens</th>
                      <th className="pb-2 text-right">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byFeature
                      .sort((a, b) => b.cost - a.cost)
                      .map((f) => (
                        <tr
                          key={f.feature}
                          className="border-b border-[#2a2a2a] last:border-0"
                        >
                          <td className="py-2 text-white">
                            {FEATURE_LABELS[f.feature] || f.feature}
                          </td>
                          <td className="py-2 text-right text-zinc-400">
                            {f.calls}
                          </td>
                          <td className="py-2 text-right text-zinc-400">
                            {formatTokens(f.tokens)}
                          </td>
                          <td className="py-2 text-right text-emerald-400 font-medium">
                            {formatCost(f.cost)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Project */}
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Nach Projekt
              </h2>
              {data.byProject.length === 0 ? (
                <p className="text-zinc-500 text-sm">Keine projektbezogenen Daten</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-[#2a2a2a]">
                        <th className="pb-2">Projekt</th>
                        <th className="pb-2 text-right">Tokens</th>
                        <th className="pb-2 text-right">Kosten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byProject
                        .sort((a, b) => b.cost - a.cost)
                        .map((p) => (
                          <tr
                            key={p.projectId}
                            className="border-b border-[#2a2a2a] last:border-0"
                          >
                            <td className="py-2 text-white">{p.projectName}</td>
                            <td className="py-2 text-right text-zinc-400">
                              {formatTokens(p.tokens)}
                            </td>
                            <td className="py-2 text-right text-emerald-400 font-medium">
                              {formatCost(p.cost)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* By Model */}
          {data.byModel.length > 0 && (
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Nach Modell
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-[#2a2a2a]">
                      <th className="pb-2">Modell</th>
                      <th className="pb-2 text-right">Calls</th>
                      <th className="pb-2 text-right">Tokens</th>
                      <th className="pb-2 text-right">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel
                      .sort((a, b) => b.cost - a.cost)
                      .map((m) => (
                        <tr
                          key={m.model}
                          className="border-b border-[#2a2a2a] last:border-0"
                        >
                          <td className="py-2 text-white font-mono text-xs">
                            {m.model}
                          </td>
                          <td className="py-2 text-right text-zinc-400">
                            {m.calls}
                          </td>
                          <td className="py-2 text-right text-zinc-400">
                            {formatTokens(m.tokens)}
                          </td>
                          <td className="py-2 text-right text-emerald-400 font-medium">
                            {formatCost(m.cost)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Source breakdown */}
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-4">
              Nach Quelle
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 text-sm font-medium mb-1">API (Mission Control)</p>
                <p className="text-xl font-bold text-white">{formatCost(data.bySource.api.cost)}</p>
                <p className="text-xs text-zinc-400">{formatTokens(data.bySource.api.tokens)} Tokens</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-purple-400 text-sm font-medium mb-1">Max/Amadeus (extern)</p>
                <p className="text-xl font-bold text-white">{formatCost(data.bySource.max.cost)}</p>
                <p className="text-xs text-zinc-400">{formatTokens(data.bySource.max.tokens)} Tokens</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
