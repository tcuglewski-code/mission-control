"use client";

import { useState } from "react";
import {
  Github,
  Slack,
  Globe,
  Mail,
  Webhook,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  Settings2,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ScrollText,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
  githubRepo: string | null;
}

interface IntegrationConfig {
  id?: string | null;
  type: string;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  status: string;
  lastTestedAt?: string | null;
  lastError?: string | null;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: number;
  duration: number;
  createdAt: string;
  payloadPreview: string;
  webhook?: { id: string; name: string; url: string } | null;
}

interface Props {
  projects: Project[];
  configuredMap: Record<string, IntegrationConfig>;
  initialLogs: WebhookLog[];
}

// ─── Integration-Definitionen ─────────────────────────────────────────────────

const INTEGRATION_DEFS = [
  {
    type: "github",
    name: "GitHub",
    description: "Empfange Push-Events und verknüpfe Commits mit Tasks",
    icon: Github,
    color: "text-white",
    bgColor: "bg-[#24292e]",
  },
  {
    type: "slack",
    name: "Slack",
    description: "Sende Benachrichtigungen bei Task-Updates, Kommentaren und Meilensteinen",
    icon: Slack,
    color: "text-[#4A154B]",
    bgColor: "bg-[#ECB22E]",
  },
  {
    type: "discord",
    name: "Discord",
    description: "Sende Benachrichtigungen an Discord-Kanäle via Webhook",
    icon: Globe,
    color: "text-white",
    bgColor: "bg-[#5865F2]",
  },
  {
    type: "smtp",
    name: "E-Mail (SMTP)",
    description: "Konfiguriere ausgehende E-Mail-Benachrichtigungen",
    icon: Mail,
    color: "text-white",
    bgColor: "bg-emerald-600",
  },
  {
    type: "webhook",
    name: "Webhook",
    description: "Generischer ausgehender Webhook für eigene Integrationen",
    icon: Webhook,
    color: "text-white",
    bgColor: "bg-blue-600",
  },
];

const AVAILABLE_EVENTS = [
  { value: "task.completed", label: "Task erledigt" },
  { value: "task.created",   label: "Task erstellt" },
  { value: "task.updated",   label: "Task aktualisiert" },
  { value: "comment.added",  label: "Neuer Kommentar" },
  { value: "milestone.completed", label: "Meilenstein erreicht" },
  { value: "ticket.created", label: "Ticket erstellt" },
  { value: "ticket.updated", label: "Ticket aktualisiert" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Aktiv
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle className="w-3 h-3" /> Fehler
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-700">
      <AlertCircle className="w-3 h-3" /> Inaktiv
    </span>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IntegrationsClient({ projects, configuredMap, initialLogs }: Props) {
  const [activeTab, setActiveTab] = useState<"uebersicht" | "logs">("uebersicht");
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>(configuredMap);
  const [editType, setEditType] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { loading?: boolean; success?: boolean; message?: string }>>({});
  const [logs, setLogs] = useState<WebhookLog[]>(initialLogs);
  const [logsLoading, setLogsLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState<Record<string, boolean>>({});
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  async function saveConfig(type: string, data: Partial<IntegrationConfig>) {
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: INTEGRATION_DEFS.find((d) => d.type === type)?.name ?? type, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setConfigs((prev) => ({ ...prev, [type]: updated }));
    }
    setEditType(null);
  }

  async function toggleEnabled(type: string, enabled: boolean) {
    const res = await fetch(`/api/integrations/${type}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, status: enabled ? "active" : "inactive" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setConfigs((prev) => ({ ...prev, [type]: updated }));
    }
  }

  async function disconnect(type: string) {
    if (!confirm(`Integration "${INTEGRATION_DEFS.find((d) => d.type === type)?.name}" wirklich trennen?`)) return;
    await fetch(`/api/integrations/${type}`, { method: "DELETE" });
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }

  async function testConnection(type: string) {
    setTestResults((prev) => ({ ...prev, [type]: { loading: true } }));
    const res = await fetch(`/api/integrations/${type}/test`, { method: "POST" });
    const data = await res.json();
    setTestResults((prev) => ({ ...prev, [type]: { success: data.success, message: data.message } }));
    // Config neu laden (Status wurde aktualisiert)
    const configRes = await fetch(`/api/integrations/${type}`);
    if (configRes.ok) {
      const updated = await configRes.json();
      setConfigs((prev) => ({ ...prev, [type]: updated }));
    }
  }

  async function reloadLogs() {
    setLogsLoading(true);
    const res = await fetch("/api/webhook-logs?limit=100");
    if (res.ok) setLogs(await res.json());
    setLogsLoading(false);
  }

  async function retryLog(logId: string) {
    setRetryLoading((prev) => ({ ...prev, [logId]: true }));
    await fetch(`/api/webhook-logs/${logId}/retry`, { method: "POST" });
    setRetryLoading((prev) => ({ ...prev, [logId]: false }));
    await reloadLogs();
  }

  const configuredCount = Object.keys(configs).length;
  const activeCount = Object.values(configs).filter((c) => c.status === "active").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-white font-semibold text-lg">Integrationen</h1>
            <p className="text-xs text-zinc-500">
              {configuredCount} konfiguriert · {activeCount} aktiv
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("uebersicht")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === "uebersicht"
                ? "bg-[#252525] text-white"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Übersicht
          </button>
          <button
            onClick={() => { setActiveTab("logs"); reloadLogs(); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === "logs"
                ? "bg-[#252525] text-white"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <ScrollText className="w-3.5 h-3.5" />
            Webhook-Log
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {activeTab === "uebersicht" ? (
          <div className="space-y-4 max-w-4xl">
            <p className="text-sm text-zinc-400">
              Verbinde externe Dienste mit Mission Control. Alle Texte und Benachrichtigungen werden auf Deutsch ausgegeben.
            </p>

            <div className="grid gap-4">
              {INTEGRATION_DEFS.map((def) => {
                const config = configs[def.type];
                const isConfigured = !!config?.id;
                const status = config?.status ?? "inactive";
                const testResult = testResults[def.type];
                const Icon = def.icon;

                return (
                  <div
                    key={def.type}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", def.bgColor)}>
                        <Icon className={cn("w-5 h-5", def.color)} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{def.name}</span>
                          <StatusBadge status={status} />
                          {isConfigured && (
                            <span className="text-xs text-zinc-500">
                              Zuletzt geprüft: {formatDate(config.lastTestedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">{def.description}</p>

                        {/* Fehler */}
                        {status === "error" && config?.lastError && (
                          <p className="mt-1.5 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                            ⚠️ {config.lastError}
                          </p>
                        )}

                        {/* Konfigurationsvorschau */}
                        {isConfigured && config.config && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {config.config.webhookUrl && (
                              <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded font-mono">
                                {String(config.config.webhookUrl).slice(0, 50)}…
                              </span>
                            )}
                            {config.config.repo && (
                              <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded">
                                Repo: {String(config.config.repo)}
                              </span>
                            )}
                            {Array.isArray(config.config.events) && config.config.events.length > 0 && (
                              <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded">
                                {config.config.events.length} Events
                              </span>
                            )}
                          </div>
                        )}

                        {/* Test-Ergebnis */}
                        {testResult && (
                          <div className={cn(
                            "mt-2 text-xs px-2 py-1 rounded",
                            testResult.loading ? "text-zinc-400 bg-[#252525]"
                              : testResult.success ? "text-emerald-400 bg-emerald-500/10"
                              : "text-red-400 bg-red-500/10"
                          )}>
                            {testResult.loading ? "Verbindung wird getestet…" : testResult.message}
                          </div>
                        )}
                      </div>

                      {/* Aktionen */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isConfigured && (
                          <>
                            {(def.type === "slack" || def.type === "discord" || def.type === "webhook" || def.type === "github") && (
                              <button
                                onClick={() => testConnection(def.type)}
                                disabled={testResult?.loading}
                                title="Verbindung testen"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-emerald-400 border border-[#333] hover:border-emerald-500/30 rounded-md transition-colors disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                Test
                              </button>
                            )}
                            <button
                              onClick={() => setEditType(def.type)}
                              title="Konfigurieren"
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-[#333] hover:border-[#444] rounded-md transition-colors"
                            >
                              <Settings2 className="w-3 h-3" />
                              Konfigurieren
                            </button>
                            <button
                              onClick={() => toggleEnabled(def.type, !config.enabled)}
                              className={cn(
                                "w-9 h-5 rounded-full transition-colors relative",
                                config.enabled ? "bg-emerald-600" : "bg-zinc-700"
                              )}
                              title={config.enabled ? "Deaktivieren" : "Aktivieren"}
                            >
                              <span className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                config.enabled ? "left-4" : "left-0.5"
                              )} />
                            </button>
                            <button
                              onClick={() => disconnect(def.type)}
                              title="Trennen"
                              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 border border-[#333] hover:border-red-500/30 rounded-md transition-colors"
                            >
                              Trennen
                            </button>
                          </>
                        )}
                        {!isConfigured && (
                          <button
                            onClick={() => setEditType(def.type)}
                            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                          >
                            Verbinden
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <WebhookLogPanel
            logs={logs}
            loading={logsLoading}
            retryLoading={retryLoading}
            expandedLog={expandedLog}
            onExpandLog={setExpandedLog}
            onRetry={retryLog}
            onRefresh={reloadLogs}
          />
        )}
      </div>

      {/* Konfigurations-Modal */}
      {editType && (
        <IntegrationModal
          type={editType}
          config={configs[editType] ?? null}
          projects={projects}
          onSave={(data) => saveConfig(editType, data)}
          onClose={() => setEditType(null)}
        />
      )}
    </div>
  );
}

// ─── Webhook-Log Panel ────────────────────────────────────────────────────────

function WebhookLogPanel({
  logs,
  loading,
  retryLoading,
  expandedLog,
  onExpandLog,
  onRetry,
  onRefresh,
}: {
  logs: WebhookLog[];
  loading: boolean;
  retryLoading: Record<string, boolean>;
  expandedLog: string | null;
  onExpandLog: (id: string | null) => void;
  onRetry: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold">Webhook-Log</h2>
          <p className="text-xs text-zinc-500">Gesendete und empfangene Webhooks der letzten 100 Einträge</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-[#333] rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Aktualisieren
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500 text-sm animate-pulse">
          Lade Logs…
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-3">
          <ScrollText className="w-8 h-8 opacity-30" />
          <p className="text-sm">Noch keine Webhook-Logs vorhanden.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#161616]">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium w-8"></th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Event</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Webhook</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Dauer</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Zeitpunkt</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const ok = log.status >= 200 && log.status < 300;
                const isExpanded = expandedLog === log.id;

                return (
                  <>
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b border-[#2a2a2a] last:border-0 transition-colors",
                        isExpanded ? "bg-[#1e1e1e]" : "hover:bg-[#1a1a1a]"
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onExpandLog(isExpanded ? null : log.id)}
                          className="text-zinc-500 hover:text-zinc-300"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zinc-300">{log.event}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {log.webhook?.name ?? <span className="text-zinc-600">unbekannt</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "flex items-center gap-1 text-xs",
                          ok ? "text-emerald-400" : "text-red-400"
                        )}>
                          {ok
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          <span className="font-mono">{log.status || "ERR"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{log.duration}ms
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(log.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })}
                      </td>
                      <td className="px-4 py-3">
                        {!ok && (
                          <button
                            onClick={() => onRetry(log.id)}
                            disabled={retryLoading[log.id]}
                            title="Erneut senden"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-amber-400 border border-[#333] hover:border-amber-500/30 rounded transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={cn("w-3 h-3", retryLoading[log.id] && "animate-spin")} />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-detail`} className="bg-[#141414] border-b border-[#2a2a2a]">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-500 font-medium">Payload-Vorschau:</p>
                            <pre className="text-xs text-zinc-300 bg-[#111] rounded p-3 overflow-x-auto font-mono whitespace-pre-wrap break-all max-h-32">
                              {log.payloadPreview}
                            </pre>
                            {log.webhook && (
                              <p className="text-xs text-zinc-500">
                                Ziel: <span className="text-zinc-400 font-mono">{log.webhook.url}</span>
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Integration Modal ────────────────────────────────────────────────────────

function IntegrationModal({
  type,
  config,
  projects,
  onSave,
  onClose,
}: {
  type: string;
  config: IntegrationConfig | null;
  projects: Project[];
  onSave: (data: Partial<IntegrationConfig>) => void;
  onClose: () => void;
}) {
  const def = INTEGRATION_DEFS.find((d) => d.type === type)!;
  const existingConfig = (config?.config ?? {}) as Record<string, unknown>;

  const [webhookUrl, setWebhookUrl] = useState(String(existingConfig.webhookUrl ?? ""));
  const [token, setToken] = useState(String(existingConfig.token ?? ""));
  const [repo, setRepo] = useState(String(existingConfig.repo ?? ""));
  const [projectId, setProjectId] = useState(String(existingConfig.projectId ?? ""));
  const [smtpHost, setSmtpHost] = useState(String(existingConfig.smtpHost ?? ""));
  const [smtpPort, setSmtpPort] = useState(String(existingConfig.smtpPort ?? "587"));
  const [smtpUser, setSmtpUser] = useState(String(existingConfig.smtpUser ?? ""));
  const [smtpPass, setSmtpPass] = useState(String(existingConfig.smtpPass ?? ""));
  const [events, setEvents] = useState<string[]>((existingConfig.events as string[]) ?? ["task.completed", "comment.added", "milestone.completed"]);
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let builtConfig: Record<string, unknown> = { events };

    if (type === "github") {
      builtConfig = { token, repo, projectId, events };
    } else if (type === "slack" || type === "discord") {
      builtConfig = { webhookUrl, events };
    } else if (type === "smtp") {
      builtConfig = { smtpHost, smtpPort: Number(smtpPort), smtpUser, smtpPass, events };
    } else if (type === "webhook") {
      builtConfig = { webhookUrl, events };
    }

    await onSave({ config: builtConfig, enabled });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#1a1a1a] z-10">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", def.bgColor)}>
              <def.icon className={cn("w-4 h-4", def.color)} />
            </div>
            <h2 className="text-white font-semibold">{def.name} konfigurieren</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* GitHub */}
          {type === "github" && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">GitHub Personal Access Token</label>
                <div className="relative">
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type={showToken ? "text" : "password"}
                    placeholder="ghp_..."
                    className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 pr-9 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Benötigt: repo (read), webhooks</p>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Repository (optional)</label>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="z.B. mein-org/mein-repo"
                  className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Projekt für GitHub-Events</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— Kein Projekt —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.githubRepo ? ` (${p.githubRepo})` : ""}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-600 mt-1">GitHub-Events werden diesem Projekt zugeordnet</p>
              </div>
              <div className="bg-[#252525] rounded-lg p-3 text-xs text-zinc-400 space-y-1">
                <p className="font-medium text-zinc-300">Webhook-URL für GitHub:</p>
                <p className="font-mono text-emerald-400 break-all">/api/webhooks/github</p>
                <p>Secret: <span className="font-mono text-zinc-300">→ GITHUB_WEBHOOK_SECRET env-Variable</span></p>
                <p>Trage diese URL in den GitHub Repo-Einstellungen unter Webhooks ein.</p>
              </div>
            </>
          )}

          {/* Slack / Discord / Webhook */}
          {(type === "slack" || type === "discord" || type === "webhook") && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                {type === "slack" ? "Slack Webhook-URL" : type === "discord" ? "Discord Webhook-URL" : "Webhook-URL"} *
              </label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                type="url"
                required
                placeholder={
                  type === "slack" ? "https://hooks.slack.com/services/..."
                  : type === "discord" ? "https://discord.com/api/webhooks/..."
                  : "https://..."
                }
                className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
              />
              {type === "slack" && (
                <p className="text-xs text-zinc-600 mt-1">
                  Erstelle einen Incoming Webhook in deinem Slack-Workspace unter App-Einstellungen.
                </p>
              )}
              {type === "discord" && (
                <p className="text-xs text-zinc-600 mt-1">
                  Erstelle einen Webhook in den Discord Kanal-Einstellungen unter Integrationen.
                </p>
              )}
            </div>
          )}

          {/* SMTP */}
          {type === "smtp" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">SMTP-Host *</label>
                  <input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Port</label>
                  <input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    type="number"
                    className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Benutzername</label>
                <input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="noreply@example.com"
                  className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    type={showToken ? "text" : "password"}
                    placeholder="App-Passwort oder SMTP-Passwort"
                    className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-md px-3 py-2 pr-9 focus:outline-none focus:border-emerald-500"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Events-Auswahl (für Slack, Discord, Webhook) */}
          {(type === "slack" || type === "discord" || type === "webhook") && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Trigger-Events (Checkboxen)</label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                      {ev.label}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono">{ev.value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Aktiv-Toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={cn("w-9 h-5 rounded-full transition-colors relative", enabled ? "bg-emerald-600" : "bg-zinc-700")}
            >
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", enabled ? "left-4" : "left-0.5")} />
            </button>
            <span className="text-sm text-zinc-300">{enabled ? "Aktiviert" : "Deaktiviert"}</span>
          </div>

          {/* Buttons */}
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
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              {saving ? "Speichere…" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
