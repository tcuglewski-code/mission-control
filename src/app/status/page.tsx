"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface SystemStatus {
  name: string;
  url: string | null;
  status: "loading" | "online" | "offline" | "unavailable";
  responseTime?: number;
}

const SYSTEMS: { name: string; url: string | null }[] = [
  { name: "ForstManager", url: "https://ka-forstmanager.vercel.app/api/health" },
  { name: "Mission Control", url: "/api/health" },
  { name: "Website", url: "https://peru-otter-113714.hostingersite.com" },
  { name: "App API", url: null },
];

async function checkHealth(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { mode: "no-cors", cache: "no-store" });
    const ms = Date.now() - start;
    // no-cors returns opaque response (status 0) — treat as online if no error thrown
    if (res.type === "opaque" || res.ok) {
      return { ok: true, ms };
    }
    return { ok: false, ms };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export default function StatusPage() {
  const [systems, setSystems] = useState<SystemStatus[]>(
    SYSTEMS.map((s) => ({
      ...s,
      status: s.url ? "loading" : "unavailable",
    }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const runChecks = async () => {
    setRefreshing(true);
    setSystems((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.url ? "loading" : "unavailable",
        responseTime: undefined,
      }))
    );

    const results = await Promise.all(
      SYSTEMS.map(async (sys) => {
        if (!sys.url) {
          return { ...sys, status: "unavailable" as const };
        }
        const result = await checkHealth(sys.url);
        return {
          ...sys,
          status: result.ok ? ("online" as const) : ("offline" as const),
          responseTime: result.ms,
        };
      })
    );

    setSystems(results);
    setLastChecked(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const onlineCount = systems.filter((s) => s.status === "online").length;
  const totalCheckable = systems.filter((s) => s.url !== null).length;
  const allOnline = onlineCount === totalCheckable;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <p className="text-zinc-400 text-sm">
            {allOnline && !refreshing
              ? "Alle Systeme sind erreichbar."
              : refreshing
              ? "Systeme werden geprüft..."
              : "Einige Systeme sind nicht erreichbar."}
          </p>
          {lastChecked && (
            <p className="text-zinc-600 text-xs mt-2">
              Zuletzt geprüft: {lastChecked.toLocaleTimeString("de-DE")}
            </p>
          )}
        </div>

        {/* Status Cards */}
        <div className="space-y-3 mb-8">
          {systems.map((sys) => (
            <div
              key={sys.name}
              className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4"
            >
              <div className="flex items-center gap-3">
                {sys.status === "loading" ? (
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                ) : sys.status === "online" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : sys.status === "offline" ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-700" />
                )}
                <span className="font-medium">{sys.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {sys.responseTime !== undefined && (
                  <span className="text-xs text-zinc-500">{sys.responseTime}ms</span>
                )}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    sys.status === "online"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : sys.status === "offline"
                      ? "bg-red-500/10 text-red-400"
                      : sys.status === "loading"
                      ? "bg-zinc-700/50 text-zinc-400"
                      : "bg-zinc-700/50 text-zinc-500"
                  }`}
                >
                  {sys.status === "online"
                    ? "Online"
                    : sys.status === "offline"
                    ? "Offline"
                    : sys.status === "loading"
                    ? "Prüfe..."
                    : "Nicht verfügbar"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={runChecks}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Erneut prüfen
          </button>
        </div>
      </div>
    </div>
  );
}
