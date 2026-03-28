"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Activity, CheckSquare, Users, Zap, RefreshCw } from "lucide-react";

const VALID_EMBED_TOKENS = process.env.NEXT_PUBLIC_EMBED_TOKEN
  ? [process.env.NEXT_PUBLIC_EMBED_TOKEN]
  : ["embed-demo-2026", "mc-widget-token"];

interface EmbedData {
  activeProjects: number;
  tasksThisWeek: number;
  teamUtilization: number;
}

function EmbedWidget() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAuthorized = VALID_EMBED_TOKENS.includes(token) || token.startsWith("mc_live_");

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    setAuthorized(true);
    loadData();
  }, [isAuthorized]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Embed lädt ohne Auth — nutzt öffentlichen Summary-Endpunkt
      const res = await fetch("/api/analytics/embed");
      if (!res.ok) throw new Error("Fehler");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // Fallback: leere Daten anzeigen
      setData({ activeProjects: 0, tasksThisWeek: 0, teamUtilization: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center max-w-sm">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Zugriff verweigert</p>
          <p className="text-xs text-gray-500">
            Ungültiger oder fehlender Token.
            <br />
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs mt-1 inline-block">
              /analytics/embed?token=DEIN_TOKEN
            </code>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  const stats = data ?? { activeProjects: 0, tasksThisWeek: 0, teamUtilization: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 font-sans">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Mission Control</p>
              <p className="text-xs text-gray-400">Koch Aufforstung GmbH</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
            <p className="text-xs text-gray-500 mt-0.5">Aktive</p>
            <p className="text-xs text-gray-400">Projekte</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.tasksThisWeek}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tasks</p>
            <p className="text-xs text-gray-400">Diese Woche</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.teamUtilization}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Team-</p>
            <p className="text-xs text-gray-400">Auslastung</p>
          </div>
        </div>

        {/* Auslastungsbalken */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Team-Auslastung gesamt</span>
            <span className="text-xs font-bold text-gray-900">{stats.teamUtilization}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stats.teamUtilization >= 90
                  ? "bg-red-500"
                  : stats.teamUtilization >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, stats.teamUtilization)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0%</span>
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Live-Daten</span>
          </div>
          {lastUpdated && (
            <span>
              Aktualisiert:{" "}
              {lastUpdated.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Embed-Hinweis */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Einbinden mit:{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
              &lt;iframe src=&quot;/analytics/embed?token=…&quot; /&gt;
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      }
    >
      <EmbedWidget />
    </Suspense>
  );
}
