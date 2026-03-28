"use client";

import { useState } from "react";
import {
  Plus,
  Webhook,
  Pencil,
  Trash2,
  Play,
  ScrollText,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; color: string }

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  projectId: string | null;
  project: Project | null;
  active: boolean;
  lastTriggered: string | null;
  lastStatus: number | null;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  payload: string;
  status: number;
  response: string | null;
  duration: number;
  createdAt: string;
}

interface WebhooksClientProps {
  initialWebhooks: WebhookItem[];
  projects: Project[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_EVENTS = [
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "comment.added",
  "milestone.completed",
  "ticket.created",
  "ticket.updated",
];

const EVENT_COLORS: Record<string, string> = {
  "task.created":        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "task.updated":        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "task.completed":      "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "task.deleted":        "bg-red-500/10 text-red-400 border-red-500/20",
  "comment.added":       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "milestone.completed": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "ticket.created":      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "ticket.updated":      "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function statusBadge(status: number | null) {
  if (!status) return <span className="text-zinc-500 text-xs">—</span>;
  const ok = status >= 200 && status < 300;
  return (
    <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border",
      ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
         : "bg-red-500/10 text-red-400 border-red-500/20"
    )}>
      {status}
    </span>
  );
}

function truncateUrl(url: string, max = 40) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > max ? short.slice(0, max) + "…" : short;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WebhooksClient({ initialWebhooks, projects }: WebhooksClientProps) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>(initialWebhooks);
  const [showModal, setShowModal] = useState(false);
  const [editWebhook, setEditWebhook] = useState<WebhookItem | null>(null);
  const [logsWebhook, setLogsWebhook] = useState<WebhookItem | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: number; duration: number; loading?: boolean }>>({});

  // ── CRUD ──

  async function refresh() {
    const res = await fetch("/api/webhooks");
    if (res.ok) setWebhooks(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("Webhook wirklich löschen?")) return;
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleToggle(wh: WebhookItem) {
    const res = await fetch(`/api/webhooks/${wh.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !wh.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWebhooks((prev) => prev.map((w) => w.id === updated.id ? updated : w));
    }
  }

  async function handleTest(wh: WebhookItem) {
    setTestResult((prev) => ({ ...prev, [wh.id]: { status: 0, duration: 0, loading: true } }));
    const res = await fetch(`/api/webhooks/${wh.id}/test`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setTestResult((prev) => ({ ...prev, [wh.id]: { status: data.status, duration: data.duration } }));
      await refresh();
    } else {
      setTestResult((prev) => ({ ...prev, [wh.id]: { status: 0, duration: 0 } }));
    }
  }

  async function handleViewLogs(wh: WebhookItem) {
    setLogsWebhook(wh);
    setSelectedLog(null);
    setLogsLoading(true);
    const res = await fetch(`/api/webhooks/${wh.id}/logs`);
    setLogsLoading(false);
    if (res.ok) setLogs(await res.json());
  }

  function openCreate() {
    setEditWebhook(null);
    setShowModal(true);
  }

  function openEdit(wh: WebhookItem) {
    setEditWebhook(wh);
    setShowModal(true);
  }

  async function handleSave(data: Partial<WebhookItem>) {
    if (editWebhook) {
      const res = await fetch(`/api/webhooks/${editWebhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setWebhooks((prev) => prev.map((w) => w.id === updated.id ? updated : w));
      }
    } else {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setWebhooks((prev) => [created, ...prev]);
      }
    }
    setShowModal(false);
  }

  // ── Render ──

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-emerald-400" />
          <h1 className="text-white font-semibold text-lg">Webhooks</h1>
          <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded-full">{webhooks.length}</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Webhook erstellen
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
            <Webhook className="w-10 h-10 opacity-30" />
            <p className="text-sm">Noch keine Webhooks konfiguriert.</p>
            <button onClick={openCreate} className="text-sm text-emerald-400 hover:underline">
              Ersten Webhook erstellen →
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[#2a2a2a] overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#161616]">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">URL</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Events</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Projekt</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Aktiv</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Zuletzt</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{wh.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-400 font-mono text-xs" title={wh.url}>
                        {truncateUrl(wh.url)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((ev) => (
                          <span key={ev} className={cn("text-xs px-1.5 py-0.5 rounded border", EVENT_COLORS[ev] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {wh.project ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wh.project.color }} />
                          {wh.project.name}
                        </span>
                      ) : "Alle"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(wh)}
                        className={cn("w-9 h-5 rounded-full transition-colors relative",
                          wh.active ? "bg-emerald-600" : "bg-zinc-700"
                        )}
                      >
                        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                          wh.active ? "left-4" : "left-0.5"
                        )} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(wh.lastTriggered)}</td>
                    <td className="px-4 py-3">
                      {testResult[wh.id]?.loading
                        ? <span className="text-xs text-zinc-400 animate-pulse">Testing…</span>
                        : testResult[wh.id]
                          ? statusBadge(testResult[wh.id].status)
                          : statusBadge(wh.lastStatus)
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTest(wh)}
                          title="Test senden"
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleViewLogs(wh)}
                          title="Logs anzeigen"
                          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                        >
                          <ScrollText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(wh)}
                          title="Bearbeiten"
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(wh.id)}
                          title="Löschen"
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <WebhookModal
          webhook={editWebhook}
          projects={projects}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Logs Modal */}
      {logsWebhook && (
        <LogsModal
          webhook={logsWebhook}
          logs={logs}
          loading={logsLoading}
          selectedLog={selectedLog}
          onSelectLog={setSelectedLog}
          onClose={() => { setLogsWebhook(null); setSelectedLog(null); }}
        />
      )}
    </div>
  );
}

// ─── Webhook Modal ─────────────────────────────────────────────────────────────

function WebhookModal({
  webhook,
  projects,
  onSave,
  onClose,
}: {
  webhook: WebhookItem | null;
  projects: Project[];
  onSave: (data: Partial<WebhookItem>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(webhook?.name ?? "");
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [secret, setSecret] = useState(webhook?.secret ?? "");
  const [showSecret, setShowSecret] = useState(false);
  const [events, setEvents] = useState<string[]>(webhook?.events ?? []);
  const [projectId, setProjectId] = useState(webhook?.projectId ?? "");
  const [active, setActive] = useState(webhook?.active ?? true);
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !url || events.length === 0) return;
    setSaving(true);
    await onSave({ name, url, secret: secret || null, events, projectId: projectId || null, active });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold">
            {webhook ? "Webhook bearbeiten" : "Webhook erstellen"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Slack Notifications"
              required
              className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">URL *</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.example.com/..."
              type="url"
              required
              className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Secret */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Secret (optional)</label>
            <div className="relative">
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                type={showSecret ? "text" : "password"}
                placeholder="HMAC-Secret für X-Webhook-Signature"
                className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 pr-9 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Events */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Events * (mind. 1)</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="accent-emerald-500"
                  />
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border", EVENT_COLORS[ev] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
                    {ev}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Projekt (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Alle Projekte</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={cn("w-9 h-5 rounded-full transition-colors relative", active ? "bg-emerald-600" : "bg-zinc-700")}
            >
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", active ? "left-4" : "left-0.5")} />
            </button>
            <span className="text-sm text-zinc-300">{active ? "Aktiv" : "Inaktiv"}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-zinc-400 hover:text-white border border-[#333] rounded-md transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving || events.length === 0}
              className="flex-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              {saving ? "Speichere…" : webhook ? "Speichern" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Logs Modal ────────────────────────────────────────────────────────────────

function LogsModal({
  webhook,
  logs,
  loading,
  selectedLog,
  onSelectLog,
  onClose,
}: {
  webhook: WebhookItem;
  logs: WebhookLog[];
  loading: boolean;
  selectedLog: WebhookLog | null;
  onSelectLog: (log: WebhookLog | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-semibold">Logs: {webhook.name}</h2>
            <span className="text-xs text-zinc-500">({logs.length})</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Log list */}
          <div className="w-1/2 border-r border-[#2a2a2a] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 text-sm animate-pulse">Lade Logs…</div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Noch keine Logs vorhanden.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2a2a2a] bg-[#161616]">
                    <th className="text-left px-3 py-2 text-zinc-400">Event</th>
                    <th className="text-left px-3 py-2 text-zinc-400">Status</th>
                    <th className="text-left px-3 py-2 text-zinc-400">ms</th>
                    <th className="text-left px-3 py-2 text-zinc-400">Zeit</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const ok = log.status >= 200 && log.status < 300;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => onSelectLog(selectedLog?.id === log.id ? null : log)}
                        className={cn(
                          "border-b border-[#2a2a2a] last:border-0 cursor-pointer transition-colors",
                          selectedLog?.id === log.id ? "bg-[#252525]" : "hover:bg-[#1e1e1e]"
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-zinc-300">{log.event}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            {ok
                              ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              : <XCircle className="w-3 h-3 text-red-400" />
                            }
                            <span className={ok ? "text-emerald-400" : "text-red-400"}>{log.status || "ERR"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{log.duration}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{new Date(log.createdAt).toLocaleTimeString("de-DE")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail pane */}
          <div className="w-1/2 overflow-auto p-4">
            {selectedLog ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Payload</p>
                  <pre className="text-xs text-zinc-300 bg-[#111] rounded-md p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(selectedLog.payload), null, 2); }
                      catch { return selectedLog.payload; }
                    })()}
                  </pre>
                </div>
                {selectedLog.response && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Response</p>
                    <pre className="text-xs text-zinc-300 bg-[#111] rounded-md p-3 overflow-auto max-h-36 whitespace-pre-wrap break-all">
                      {selectedLog.response}
                    </pre>
                  </div>
                )}
                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Event: <span className="text-zinc-300">{selectedLog.event}</span></p>
                  <p>Status: <span className="text-zinc-300">{selectedLog.status || "Connection Error"}</span></p>
                  <p>Dauer: <span className="text-zinc-300">{selectedLog.duration}ms</span></p>
                  <p>Zeit: <span className="text-zinc-300">{new Date(selectedLog.createdAt).toLocaleString("de-DE")}</span></p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs gap-2">
                <ExternalLink className="w-6 h-6 opacity-30" />
                <p>Log auswählen für Details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
