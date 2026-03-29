"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Inbox,
  CheckSquare,
  ArrowRight,
  Clock,
  RefreshCw,
  FolderKanban,
  X,
  Zap,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
}

interface InboxTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  projectId: string | null;
  project: Project | null;
}

// ─── Prioritäts-Badge ─────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-zinc-400 bg-zinc-800",
  medium: "text-amber-400 bg-amber-900/30",
  high: "text-red-400 bg-red-900/30",
  urgent: "text-red-300 bg-red-900/50",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

// ─── Task zuweisen Dialog ─────────────────────────────────────────────────────

interface AssignDialogProps {
  task: InboxTask;
  projects: Project[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignDialog({ task, projects, onClose, onAssigned }: AssignDialogProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!selectedProject) {
      setError("Bitte wähle ein Projekt aus.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fehler beim Zuweisen");
      }
      onAssigned();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Projekt zuweisen</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300 line-clamp-2">{task.title}</p>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white appearance-none outline-none focus:border-emerald-600 transition-colors"
            >
              <option value="">— Projekt wählen —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white rounded-xl border border-[#333] hover:bg-[#252525] transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || !selectedProject}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              Zuweisen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Haupt-Seite ──────────────────────────────────────────────────────────────

export default function TaskInboxPage() {
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTask, setAssignTask] = useState<InboxTask | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch("/api/tasks?noProject=true"),
        fetch("/api/projects"),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleComplete = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostpone = async (taskId: string) => {
    setActionLoading(taskId + "-postpone");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: tomorrow.toISOString() }),
      });
      // Aktualisiere nur das dueDate lokal
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, dueDate: tomorrow.toISOString() } : t
        )
      );
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <AppShell title="Task-Inbox" subtitle="Nicht zugewiesene Aufgaben">
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <Inbox className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                Task-Inbox
                {pendingTasks.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded-full font-bold">
                    {pendingTasks.length}
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-500">
                Tasks ohne Projekt-Zuweisung
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-zinc-500 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Inhalt */}
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Lade Tasks…</span>
          </div>
        ) : pendingTasks.length === 0 && doneTasks.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-4 text-zinc-600">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <Inbox className="w-7 h-7 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-400">Inbox ist leer</p>
              <p className="text-xs text-zinc-600 mt-1">
                Alle Tasks sind einem Projekt zugewiesen
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3 hover:border-[#3a3a3a] transition-colors"
              >
                {/* Task-Titel + Meta */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full font-medium",
                          PRIORITY_COLORS[task.priority] ?? "text-zinc-400 bg-zinc-800"
                        )}
                      >
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          fällig{" "}
                          {formatDistanceToNow(new Date(task.dueDate), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-600">
                        erstellt{" "}
                        {formatDistanceToNow(new Date(task.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aktions-Buttons */}
                <div className="flex gap-2">
                  {/* Jetzt erledigen */}
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={actionLoading === task.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-400 border border-emerald-700/40 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading === task.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckSquare className="w-3 h-3" />
                    )}
                    Erledigt
                  </button>

                  {/* Projekt zuweisen */}
                  <button
                    onClick={() => setAssignTask(task)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-700/20 hover:bg-blue-700/30 text-blue-400 border border-blue-700/40 rounded-lg text-xs font-medium transition-colors"
                  >
                    <FolderKanban className="w-3 h-3" />
                    Projekt zuweisen
                  </button>

                  {/* Verschieben */}
                  <button
                    onClick={() => handlePostpone(task.id)}
                    disabled={actionLoading === task.id + "-postpone"}
                    className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700/20 hover:bg-zinc-700/30 text-zinc-400 border border-zinc-700/40 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ml-auto"
                  >
                    {actionLoading === task.id + "-postpone" ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Morgen
                  </button>
                </div>
              </div>
            ))}

            {/* Erledigte Tasks */}
            {doneTasks.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3 font-medium">
                  Erledigt ({doneTasks.length})
                </p>
                <div className="space-y-2">
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3 opacity-60"
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-zinc-500 line-through">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zuweis-Dialog */}
      {assignTask && (
        <AssignDialog
          task={assignTask}
          projects={projects}
          onClose={() => setAssignTask(null)}
          onAssigned={fetchData}
        />
      )}
    </AppShell>
  );
}
