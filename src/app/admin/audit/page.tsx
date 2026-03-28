"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userEmail: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string; avatar: string | null; role: string } | null;
  project: { name: string; color: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  created:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  updated:  "text-amber-400  bg-amber-500/10  border-amber-500/20",
  deleted:  "text-red-400    bg-red-500/10    border-red-500/20",
  login:    "text-sky-400    bg-sky-500/10    border-sky-500/20",
  webhook:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  archived: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const ACTION_LABELS: Record<string, string> = {
  created:  "Erstellt",
  updated:  "Aktualisiert",
  deleted:  "Gelöscht",
  login:    "Login",
  webhook:  "Webhook",
  archived: "Archiviert",
};

const RESOURCE_LABELS: Record<string, string> = {
  task:    "Aufgabe",
  project: "Projekt",
  user:    "Benutzer",
  sprint:  "Sprint",
};

function actionClass(action: string) {
  return (
    ACTION_COLORS[action] ??
    "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
  );
}

function fmt(dateStr: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateStr));
}

export default function AuditTrailPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [filterAction,   setFilterAction]   = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [search,         setSearch]         = useState("");
  const [searchInput,    setSearchInput]    = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterAction)   params.set("action",   filterAction);
      if (filterResource) params.set("resource", filterResource);
      if (search)         params.set("search",   search);

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Fehler beim Laden");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterResource, search]);

  useEffect(() => { load(); }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterAction, filterResource, search]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Audit Trail</h1>
            <p className="text-xs text-zinc-500">
              {total > 0 ? `${total} Einträge gesamt` : "Aktivitätsprotokoll"}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[#252525] text-zinc-400 hover:text-white border border-[#2a2a2a] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            onBlur={() => setSearch(searchInput)}
            className="w-full pl-9 pr-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Action filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="pl-8 pr-8 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Alle Aktionen</option>
            {Object.entries(ACTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Resource filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="pl-8 pr-8 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Alle Ressourcen</option>
            {Object.entries(RESOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a2a] overflow-hidden bg-[#161616]">
        {/* Table header */}
        <div className="grid grid-cols-[160px_1fr_110px_120px_120px_80px] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-xs font-medium text-zinc-500 uppercase tracking-wide">
          <span>Zeitpunkt</span>
          <span>Ressource</span>
          <span>Aktion</span>
          <span>User</span>
          <span>Projekt</span>
          <span>Details</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Lade Daten…
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
            <ShieldCheck className="w-8 h-8 opacity-30" />
            <span className="text-sm">Keine Einträge gefunden</span>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="grid grid-cols-[160px_1fr_110px_120px_120px_80px] gap-3 px-4 py-3 text-sm hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  {/* Zeit */}
                  <span className="text-zinc-500 font-mono text-xs leading-5 pt-0.5 truncate" title={fmt(log.createdAt)}>
                    {fmt(log.createdAt)}
                  </span>

                  {/* Ressource */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-white truncate font-medium">{log.entityName}</span>
                    <span className="text-zinc-600 text-xs truncate">
                      {RESOURCE_LABELS[log.entityType] ?? log.entityType} · {log.entityId.slice(0, 8)}
                    </span>
                  </div>

                  {/* Aktion */}
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-xs font-medium self-center ${actionClass(log.action)}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>

                  {/* User */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-emerald-400">
                      {(log.user?.name ?? log.userEmail ?? "?")[0]?.toUpperCase()}
                    </div>
                    <span className="text-zinc-400 text-xs truncate">
                      {log.user?.name ?? log.userEmail ?? "System"}
                    </span>
                  </div>

                  {/* Projekt */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {log.project ? (
                      <>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: log.project.color }}
                        />
                        <span className="text-zinc-400 text-xs truncate">{log.project.name}</span>
                      </>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </div>

                  {/* Details toggle */}
                  <div className="flex items-center justify-center">
                    {(log.details || log.metadata) ? (
                      <span className="text-xs text-amber-400/70 hover:text-amber-400">
                        {expandedId === log.id ? "▲" : "▼"}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === log.id && (log.details || log.ipAddress) && (
                  <div className="px-4 pb-3 bg-[#1a1a1a] border-t border-[#252525]">
                    <div className="mt-2 rounded-lg bg-[#0e0e0e] border border-[#2a2a2a] p-3 text-xs font-mono text-zinc-400 overflow-auto max-h-48">
                      {log.ipAddress && (
                        <div className="mb-1 text-zinc-600">IP: {log.ipAddress}</div>
                      )}
                      {log.details && (
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            Seite {page} von {pages} · {total} Einträge
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-[#2a2a2a] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, pages) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page + i - 3;
              if (p < 1 || p > pages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-xs border transition-colors ${
                    p === page
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-semibold"
                      : "border-[#2a2a2a] text-zinc-500 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-md border border-[#2a2a2a] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
