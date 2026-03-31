"use client";

import React, { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle, XCircle, Clock, Table2, History, Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DbStatus {
  status: string;
  tableCount: number;
  tables: string[];
  lastMigration: {
    name: string;
    finishedAt: string;
  } | null;
  checkedAt: string;
}

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  stdout: string | null;
  stderr: string | null;
  duration: string;
  executedAt: string;
}

export default function DbSyncPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showTables, setShowTables] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/db-sync");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Fehler beim Laden des DB-Status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/admin/db-sync", {
        method: "POST",
      });
      const data = await res.json();
      setSyncResult(data);

      // Reload status after sync
      if (data.success) {
        await loadStatus();
      }
    } catch (err) {
      console.error("Fehler beim DB Sync:", err);
      setSyncResult({
        success: false,
        error: String(err),
        stdout: null,
        stderr: null,
        duration: "0ms",
        executedAt: new Date().toISOString(),
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
        <RefreshCw className="w-6 h-6 text-[#C5A55A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-[#C5A55A]" />
            Database Sync
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
            Prisma Schema mit der Datenbank synchronisieren
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Status aktualisieren
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: syncing ? "#1e2a14" : "#2C3A1C" }}
            onMouseEnter={(e) => !syncing && (e.currentTarget.style.backgroundColor = "#3d4f2a")}
            onMouseLeave={(e) => !syncing && (e.currentTarget.style.backgroundColor = "#2C3A1C")}
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Synchronisiere...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                DB Sync jetzt ausführen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Table Count */}
        <div className="bg-white dark:bg-[#161616] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2C3A1C" }}>
              <Table2 className="w-5 h-5 text-[#C5A55A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Tabellen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {status?.tableCount ?? "—"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTables(!showTables)}
            className="text-xs text-[#C5A55A] hover:underline"
          >
            {showTables ? "Tabellen ausblenden" : "Tabellen anzeigen"}
          </button>
        </div>

        {/* Last Migration */}
        <div className="bg-white dark:bg-[#161616] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2C3A1C" }}>
              <History className="w-5 h-5 text-[#C5A55A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-zinc-500">Letzte Migration</p>
              {status?.lastMigration ? (
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={status.lastMigration.name}>
                  {status.lastMigration.name.slice(0, 30)}...
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Keine Migrationen</p>
              )}
            </div>
          </div>
          {status?.lastMigration?.finishedAt && (
            <p className="text-xs text-gray-500 dark:text-zinc-600">
              {new Date(status.lastMigration.finishedAt).toLocaleString("de-DE")}
            </p>
          )}
        </div>

        {/* Last Check */}
        <div className="bg-white dark:bg-[#161616] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2C3A1C" }}>
              <Clock className="w-5 h-5 text-[#C5A55A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Letzter Check</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {status?.checkedAt
                  ? new Date(status.checkedAt).toLocaleString("de-DE")
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verbindung OK
          </p>
        </div>
      </div>

      {/* Tables List (Collapsible) */}
      {showTables && status?.tables && (
        <div className="mb-8 bg-white dark:bg-[#161616] rounded-xl p-6 border border-gray-200 dark:border-[#2a2a2a]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-[#C5A55A]" />
            Alle Tabellen ({status.tables.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {status.tables.map((table) => (
              <div
                key={table}
                className="px-3 py-2 bg-gray-100 dark:bg-[#0f0f0f] rounded-lg text-xs font-mono text-gray-700 dark:text-zinc-400"
              >
                {table}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div
          className={cn(
            "mb-8 rounded-xl p-6 border",
            syncResult.success
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
          )}
        >
          <div className="flex items-start gap-3 mb-4">
            {syncResult.success ? (
              <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            )}
            <div>
              <h3 className={cn(
                "font-semibold",
                syncResult.success ? "text-emerald-400" : "text-red-400"
              )}>
                {syncResult.success ? "Sync erfolgreich" : "Sync fehlgeschlagen"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">
                Dauer: {syncResult.duration} • {new Date(syncResult.executedAt).toLocaleString("de-DE")}
              </p>
            </div>
          </div>

          {/* Output */}
          {(syncResult.stdout || syncResult.stderr) && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">Output:</p>
              <pre className="bg-black/30 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                {syncResult.stdout || ""}
                {syncResult.stderr && (
                  <span className="text-red-400">{"\n"}{syncResult.stderr}</span>
                )}
              </pre>
            </div>
          )}

          {syncResult.error && !syncResult.stderr && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{syncResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 border rounded-xl" style={{ backgroundColor: "rgba(44, 58, 28, 0.1)", borderColor: "rgba(197, 165, 90, 0.3)" }}>
        <h3 className="font-medium flex items-center gap-2 mb-2" style={{ color: "#C5A55A" }}>
          <AlertTriangle className="w-4 h-4" />
          Hinweis
        </h3>
        <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-2">
          <p>
            <strong>Automatische Synchronisation:</strong> Bei jedem Push auf <code className="px-1 py-0.5 bg-black/20 rounded text-xs">master</code> wird 
            das Schema automatisch via GitHub Actions synchronisiert.
          </p>
          <p>
            <strong>Manueller Sync:</strong> Der Button führt <code className="px-1 py-0.5 bg-black/20 rounded text-xs">prisma db push --accept-data-loss</code> aus.
            Bestehende Daten können verloren gehen, wenn Spalten entfernt werden.
          </p>
          <p>
            <strong>Für Produktion empfohlen:</strong> Verwende <code className="px-1 py-0.5 bg-black/20 rounded text-xs">prisma migrate</code> mit 
            Migration-Files für kontrollierte Schema-Änderungen.
          </p>
        </div>
      </div>
    </div>
  );
}
