"use client";

import { useEffect, useState, useCallback } from "react";
import { WidgetShell } from "./WidgetShell";
import { Database, RefreshCw } from "lucide-react";

interface NeonStatus {
  status: "connected" | "error";
  database: string;
  provider: string;
  region: string;
  responseTimeMs: number;
  timestamp: string;
  error?: string;
}

export function NeonMonitorWidget() {
  const [data, setData] = useState<NeonStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/neon-status");
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        status: "error",
        database: "MissionControlDB",
        provider: "Neon",
        region: "eu-central-1 (Frankfurt)",
        responseTimeMs: -1,
        timestamp: new Date().toISOString(),
        error: "Fetch fehlgeschlagen",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const isHealthy = data?.status === "connected";
  const latencyColor =
    (data?.responseTimeMs ?? 0) < 100
      ? "text-emerald-400"
      : (data?.responseTimeMs ?? 0) < 300
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <WidgetShell
      title="Neon DB"
      icon={<Database className="w-4 h-4 text-emerald-400" />}
      badge={
        <button
          onClick={() => {
            setLoading(true);
            fetchStatus();
          }}
          className="text-zinc-500 hover:text-white transition-colors"
          title="Jetzt prüfen"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {loading && !data ? (
        <div className="px-5 py-4 text-sm text-zinc-500">Verbindung wird geprüft...</div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${isHealthy ? "text-emerald-400" : "text-red-400"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {isHealthy ? "Verbunden" : "Fehler"}
            </span>
          </div>

          {/* Latency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Latenz</span>
            <span className={`text-sm font-mono font-medium ${latencyColor}`}>
              {data?.responseTimeMs != null && data.responseTimeMs >= 0
                ? `${data.responseTimeMs}ms`
                : "—"}
            </span>
          </div>

          {/* Region */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Region</span>
            <span className="text-sm text-zinc-300">{data?.region ?? "—"}</span>
          </div>

          {/* Database */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Datenbank</span>
            <span className="text-sm text-zinc-300">{data?.database ?? "—"}</span>
          </div>

          {/* Error */}
          {data?.error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
              {data.error}
            </p>
          )}

          {/* Last updated */}
          <p className="text-xs text-zinc-600 pt-1">
            Aktualisiert:{" "}
            {data?.timestamp
              ? new Date(data.timestamp).toLocaleTimeString("de-DE")
              : "—"}
          </p>
        </div>
      )}
    </WidgetShell>
  );
}
