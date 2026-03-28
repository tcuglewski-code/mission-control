"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  Globe,
  GitBranch,
  Clock,
  Shield,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface DbStatus {
  ok: boolean;
  latencyMs: number | null;
}

interface DeploymentInfo {
  env: string;
  url: string | null;
  gitCommitRef: string | null;
  gitCommitSha: string | null;
  gitCommitMessage: string | null;
  gitRepoOwner: string | null;
  gitRepoSlug: string | null;
  region: string | null;
  deployedAt: string | null;
}

interface VercelDeploy {
  uid: string;
  name: string;
  state: string;
  created: number;
  url: string;
  meta?: Record<string, string>;
}

interface ErrorLogEntry {
  id: string;
  path: string;
  method: string;
  statusCode: number;
  message: string;
  createdAt: string;
}

interface SystemStatus {
  db: DbStatus;
  deployment: DeploymentInfo;
  vercelDeploys: VercelDeploy[];
  envCheck: Record<string, boolean>;
  errorLogs: ErrorLogEntry[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 text-xs text-emerald-400">
      <CheckCircle2 className="w-3.5 h-3.5" /> OK
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <XCircle className="w-3.5 h-3.5" /> Fehler
    </span>
  );
}

function StateChip({ state }: { state: string }) {
  const map: Record<string, string> = {
    READY: "bg-emerald-500/15 text-emerald-400",
    BUILDING: "bg-yellow-500/15 text-yellow-400",
    ERROR: "bg-red-500/15 text-red-400",
    CANCELED: "bg-zinc-500/15 text-zinc-400",
    QUEUED: "bg-blue-500/15 text-blue-400",
  };
  const cls = map[state] ?? "bg-zinc-500/15 text-zinc-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{state}</span>
  );
}

function StatusCodeChip({ code }: { code: number }) {
  const cls =
    code >= 500
      ? "bg-red-500/15 text-red-400"
      : code >= 400
      ? "bg-yellow-500/15 text-yellow-400"
      : "bg-zinc-500/15 text-zinc-400";
  return <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${cls}`}>{code}</span>;
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatIso(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function SystemStatusClient() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorLogOpen, setErrorLogOpen] = useState(true);
  const [clearingLog, setClearingLog] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/settings/system");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearErrorLog = async () => {
    if (!confirm("Fehler-Protokoll wirklich löschen?")) return;
    setClearingLog(true);
    await fetch("/api/error-log", { method: "DELETE" });
    setClearingLog(false);
    load(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Lade System-Status…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Status konnte nicht geladen werden.
      </div>
    );
  }

  const missingEnv = Object.entries(data.envCheck).filter(([, set]) => !set);
  const setEnv = Object.entries(data.envCheck).filter(([, set]) => set);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* ─── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">System-Status</h1>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors border border-[#2a2a2a]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* ─── Datenbank ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Datenbankverbindung</h2>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4">
          <div className="flex items-center justify-between">
            <div>
              <StatusBadge ok={data.db.ok} />
              {data.db.latencyMs !== null && (
                <p className="text-xs text-zinc-500 mt-1">Latenz: {data.db.latencyMs} ms</p>
              )}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                data.db.ok ? "bg-emerald-400" : "bg-red-400"
              } shadow-[0_0_8px_currentColor]`}
            />
          </div>
        </div>
      </section>

      {/* ─── Deployment ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Deployment-Info</h2>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] divide-y divide-[#2a2a2a]">
          {[
            {
              label: "Umgebung",
              value: (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    data.deployment.env === "production"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-yellow-500/15 text-yellow-400"
                  }`}
                >
                  {data.deployment.env}
                </span>
              ),
            },
            {
              label: "URL",
              value: data.deployment.url ? (
                <a
                  href={data.deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs truncate max-w-[280px]"
                >
                  {data.deployment.url}
                </a>
              ) : (
                <span className="text-zinc-600 text-xs">—</span>
              ),
            },
            {
              label: "Branch",
              icon: <GitBranch className="w-3 h-3" />,
              value: (
                <span className="text-xs text-zinc-300 font-mono">
                  {data.deployment.gitCommitRef ?? "—"}
                </span>
              ),
            },
            {
              label: "Commit",
              value: (
                <span className="text-xs text-zinc-300 font-mono">
                  {data.deployment.gitCommitSha ?? "—"}
                  {data.deployment.gitCommitMessage && (
                    <span className="text-zinc-500 ml-2 font-sans">
                      {data.deployment.gitCommitMessage.slice(0, 60)}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: "Region",
              value: (
                <span className="text-xs text-zinc-300">{data.deployment.region ?? "—"}</span>
              ),
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                {icon}
                {label}
              </span>
              {value}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Vercel Deploys ───────────────────────────────────────────────── */}
      {data.vercelDeploys.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Letzte Deployments</h2>
          </div>
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111] divide-y divide-[#2a2a2a]">
            {data.vercelDeploys.map((d, i) => (
              <div key={d.uid} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-zinc-600 w-4 shrink-0">{i + 1}</span>
                <StateChip state={d.state} />
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline truncate flex-1"
                >
                  {d.url}
                </a>
                <span className="text-xs text-zinc-600 shrink-0">{formatTs(d.created)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Umgebungsvariablen ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Umgebungsvariablen</h2>
          {missingEnv.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-xs">
              <AlertCircle className="w-3 h-3" />
              {missingEnv.length} fehlen
            </span>
          )}
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] divide-y divide-[#2a2a2a]">
          {[...Object.entries(data.envCheck)].sort(([, a], [, b]) =>
            a === b ? 0 : a ? 1 : -1
          ).map(([key, isSet]) => (
            <div key={key} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-mono text-zinc-300">{key}</span>
              {isSet ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Gesetzt
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> Fehlt
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Fehler-Protokoll ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white">Fehler-Protokoll</h2>
          <span className="text-xs text-zinc-600">(letzte 50 Einträge)</span>
          <div className="ml-auto flex items-center gap-2">
            {data.errorLogs.length > 0 && (
              <button
                onClick={clearErrorLog}
                disabled={clearingLog}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
              >
                {clearingLog ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Löschen
              </button>
            )}
            <button
              onClick={() => setErrorLogOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              {errorLogOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {errorLogOpen && (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111] overflow-hidden">
            {data.errorLogs.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-zinc-600 text-sm gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Keine Fehler protokolliert
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Zeit</th>
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Methode</th>
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Pfad</th>
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Status</th>
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Meldung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {data.errorLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#161616] transition-colors">
                        <td className="px-4 py-2 text-zinc-600 whitespace-nowrap font-mono">
                          {formatIso(log.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-zinc-400 font-mono font-medium">
                          {log.method}
                        </td>
                        <td className="px-4 py-2 text-zinc-300 font-mono max-w-[200px] truncate">
                          {log.path}
                        </td>
                        <td className="px-4 py-2">
                          <StatusCodeChip code={log.statusCode} />
                        </td>
                        <td className="px-4 py-2 text-zinc-400 max-w-[300px] truncate">
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
