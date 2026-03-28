"use client";

import { useState, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  RotateCcw,
  Settings,
  List,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoopTask {
  id: string;
  title: string;
  description: string | null;
  repo: string;
  priority: string;
  status: string;
  result: string | null;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface LoopSettings {
  id: string;
  enabled: boolean;
  scheduleExpr: string;
  timezone: string;
  maxTasksPerNight: number;
  model: string;
  updatedAt: string;
}

interface LoopLog {
  id: string;
  taskId: string | null;
  message: string;
  level: string;
  createdAt: string;
}

interface Props {
  initialTasks: LoopTask[];
  initialSettings: LoopSettings;
  initialLogs: LoopLog[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const REPOS = [
  { value: "ka-forstmanager", label: "ForstManager", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "ka-app", label: "Mobile App", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "mission-control", label: "Mission Control", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { value: "wordpress", label: "WordPress", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "research", label: "Research", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
];

const PRIORITIES = [
  { value: "high", label: "Hoch", icon: "🔴" },
  { value: "medium", label: "Mittel", icon: "🟡" },
  { value: "low", label: "Niedrig", icon: "🟢" },
];

const MODELS = [
  { value: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5" },
  { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

const TIMEZONES = [
  "Europe/Berlin",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "UTC",
];

function getRepoStyle(repo: string) {
  return REPOS.find((r) => r.value === repo)?.color ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

function getRepoLabel(repo: string) {
  return REPOS.find((r) => r.value === repo)?.label ?? repo;
}

function getPrioIcon(priority: string) {
  return PRIORITIES.find((p) => p.value === priority)?.icon ?? "🟡";
}

function getStatusStyle(status: string) {
  switch (status) {
    case "todo":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    case "in_progress":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse";
    case "done":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "failed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "todo": return "Todo";
    case "in_progress": return "In Arbeit";
    case "done": return "Fertig";
    case "failed": return "Fehler";
    default: return status;
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    default:
      return <Info className="w-4 h-4 text-blue-400" />;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseCronExpression(expr: string): string {
  // Einfacher Cron-Parser für Vorschau
  const parts = expr.split(" ");
  if (parts.length !== 5) return "Ungültiger Ausdruck";
  
  const [minute, hour, , , ] = parts;
  
  if (minute === "0,30" && hour === "1-4") {
    return "Alle 30 Min zwischen 01:00–04:59";
  }
  if (minute === "0" && hour === "*") {
    return "Jede volle Stunde";
  }
  if (minute === "*/30") {
    return "Alle 30 Minuten";
  }
  
  return `${minute} Min, ${hour} Uhr`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoopClient({ initialTasks, initialSettings, initialLogs }: Props) {
  const [activeTab, setActiveTab] = useState<"queue" | "settings" | "log">("queue");
  const [tasks, setTasks] = useState<LoopTask[]>(initialTasks);
  const [settings, setSettings] = useState<LoopSettings>(initialSettings);
  const [logs, setLogs] = useState<LoopLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Form State für neuen Task
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRepo, setNewRepo] = useState("mission-control");
  const [newPriority, setNewPriority] = useState("medium");

  // Settings Form State
  const [settingsEnabled, setSettingsEnabled] = useState(settings.enabled);
  const [settingsSchedule, setSettingsSchedule] = useState(settings.scheduleExpr);
  const [settingsTimezone, setSettingsTimezone] = useState(settings.timezone);
  const [settingsMaxTasks, setSettingsMaxTasks] = useState(settings.maxTasksPerNight);
  const [settingsModel, setSettingsModel] = useState(settings.model);
  const [savingSettings, setSavingSettings] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loop/tasks");
      const data = await res.json();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/loop/logs");
      const data = await res.json();
      setLogs(data);
    } catch {}
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const createTask = async () => {
    if (!newTitle.trim()) return;
    
    try {
      const res = await fetch("/api/loop/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          repo: newRepo,
          priority: newPriority,
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewRepo("mission-control");
        setNewPriority("medium");
        refreshTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Task wirklich löschen?")) return;
    
    try {
      await fetch(`/api/loop/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const retryTask = async (id: string) => {
    try {
      await fetch(`/api/loop/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "todo", errorMsg: null, result: null }),
      });
      refreshTasks();
    } catch (error) {
      console.error("Error retrying task:", error);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/loop/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settingsEnabled,
          scheduleExpr: settingsSchedule,
          timezone: settingsTimezone,
          maxTasksPerNight: settingsMaxTasks,
          model: settingsModel,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSavingSettings(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm("Alle Logs wirklich löschen?")) return;
    
    try {
      await fetch("/api/loop/logs", { method: "DELETE" });
      setLogs([]);
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell title="🔄 Auto-Loop" subtitle="Automatisierte Nacht-Tasks (Ralph Loop)">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-zinc-900/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "queue"
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          )}
        >
          <List className="w-4 h-4" />
          Queue
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "settings"
              ? "bg-blue-500/20 text-blue-400"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          )}
        >
          <Settings className="w-4 h-4" />
          Einstellungen
        </button>
        <button
          onClick={() => { setActiveTab("log"); refreshLogs(); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "log"
              ? "bg-violet-500/20 text-violet-400"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          )}
        >
          <FileText className="w-4 h-4" />
          Log
        </button>
      </div>

      {/* Tab: Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Header mit Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                settings.enabled
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-500/20 text-zinc-400"
              )}>
                {settings.enabled ? "Loop aktiv" : "Loop inaktiv"}
              </span>
              <span className="text-xs text-zinc-500">
                {tasks.filter((t) => t.status === "todo").length} Tasks in Queue
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshTasks}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Task hinzufügen
              </button>
            </div>
          </div>

          {/* Task Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr className="text-left text-zinc-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Titel</th>
                  <th className="px-4 py-3 font-medium">Repo</th>
                  <th className="px-4 py-3 font-medium">Prio</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Erstellt</th>
                  <th className="px-4 py-3 font-medium">Ergebnis</th>
                  <th className="px-4 py-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                      Keine Tasks vorhanden
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {task.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-white">
                        <div>
                          <span className="font-medium">{task.title}</span>
                          {task.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded border text-xs font-medium", getRepoStyle(task.repo))}>
                          {getRepoLabel(task.repo)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span title={task.priority}>{getPrioIcon(task.priority)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded border text-xs font-medium", getStatusStyle(task.status))}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {formatDate(task.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {task.status === "done" && task.result && (
                          <span className="text-xs text-emerald-400 truncate block max-w-[150px]" title={task.result}>
                            ✓ {task.result.slice(0, 30)}…
                          </span>
                        )}
                        {task.status === "failed" && task.errorMsg && (
                          <span className="text-xs text-red-400 truncate block max-w-[150px]" title={task.errorMsg}>
                            ✗ {task.errorMsg.slice(0, 30)}…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {task.status === "failed" && (
                            <button
                              onClick={() => retryTask(task.id)}
                              title="Wiederholen"
                              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {(task.status === "todo" || task.status === "failed") && (
                            <button
                              onClick={() => deleteTask(task.id)}
                              title="Löschen"
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Einstellungen */}
      {activeTab === "settings" && (
        <div className="max-w-xl space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Loop aktivieren</h3>
                <p className="text-sm text-zinc-500">Automatische Nacht-Tasks ausführen</p>
              </div>
              <button
                onClick={() => setSettingsEnabled(!settingsEnabled)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  settingsEnabled ? "bg-emerald-500" : "bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                    settingsEnabled && "translate-x-6"
                  )}
                />
              </button>
            </div>

            {/* Cron Expression */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Schedule (Cron)</label>
              <input
                type="text"
                value={settingsSchedule}
                onChange={(e) => setSettingsSchedule(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0,30 1-4 * * *"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Vorschau: {parseCronExpression(settingsSchedule)}
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Zeitzone</label>
              <select
                value={settingsTimezone}
                onChange={(e) => setSettingsTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* Max Tasks */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Max Tasks pro Nacht: {settingsMaxTasks}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={settingsMaxTasks}
                onChange={(e) => setSettingsMaxTasks(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Modell</label>
              <select
                value={settingsModel}
                onChange={(e) => setSettingsModel(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors"
            >
              {savingSettings ? "Speichern…" : "Einstellungen speichern"}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Log */}
      {activeTab === "log" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">{logs.length} Log-Einträge</span>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-md text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Logs leeren
            </button>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
            {logs.length === 0 ? (
              <div className="px-4 py-12 text-center text-zinc-500">
                Keine Log-Einträge vorhanden
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{log.message}</p>
                    {log.taskId && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Task: {log.taskId.slice(0, 8)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Neuer Task */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Neue Loop-Task</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Titel *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Was soll gemacht werden?"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Beschreibung</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Optionale Details…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Repository</label>
                <select
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {REPOS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Priorität</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={createTask}
                disabled={!newTitle.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
              >
                Task erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
