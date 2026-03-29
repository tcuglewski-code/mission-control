"use client";

import { useState, useCallback } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  Flag, Plus, Play, CheckCheck, Trash2, Edit2, X, ChevronLeft,
  GripVertical, ArrowRight, Clock, Target, TrendingUp, List
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

// ─── Typen ──────────────────────────────────────────────────────────────────

interface Assignee {
  id: string;
  name: string;
  avatar: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  assignee: Assignee | null;
  sprintId: string | null;
  projectId: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface SprintData {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  storyPoints: number | null;
  completedPoints: number | null;
  projectId?: string | null;
  tasks: TaskItem[];
}

interface Props {
  project: Project;
  initialSprints: SprintData[];
  initialBacklogTasks: TaskItem[];
}

// ─── Konstanten ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "Planung", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  active: { label: "Aktiv", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  completed: { label: "Abgeschlossen", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  cancelled: { label: "Abgebrochen", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Kritisch", color: "text-red-400" },
  high: { label: "Hoch", color: "text-orange-400" },
  medium: { label: "Mittel", color: "text-yellow-400" },
  low: { label: "Niedrig", color: "text-zinc-400" },
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Task Karte ──────────────────────────────────────────────────────────────

function TaskCard({ task, onAssign, sprints }: { 
  task: TaskItem; 
  onAssign: (taskId: string, sprintId: string | null) => void;
  sprints: SprintData[];
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors group">
      <GripVertical className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 cursor-grab shrink-0" />
      
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
        "bg-emerald-500": task.status === "done",
        "bg-orange-500": task.status === "in_progress",
        "bg-blue-500": task.status === "in_review",
        "bg-zinc-600": !["done", "in_progress", "in_review"].includes(task.status),
      })} />

      <span className="text-sm text-white flex-1 truncate">{task.title}</span>

      <span className={cn("text-[10px] shrink-0", priorityCfg.color)}>
        {priorityCfg.label}
      </span>

      {task.storyPoints != null && (
        <span className="text-[10px] text-zinc-500 font-mono shrink-0">{task.storyPoints} SP</span>
      )}

      {/* Sprint-Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-[#252525] transition-colors"
        >
          <ArrowRight className="w-3 h-3" />
          <span className="hidden sm:inline">Sprint</span>
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg shadow-xl z-50 py-1">
            <button
              onClick={() => { onAssign(task.id, null); setShowDropdown(false); }}
              className="w-full px-3 py-1.5 text-xs text-left text-zinc-400 hover:bg-[#252525] hover:text-white"
            >
              Ins Backlog
            </button>
            {sprints.filter(s => s.status !== "completed").map((s) => (
              <button
                key={s.id}
                onClick={() => { onAssign(task.id, s.id); setShowDropdown(false); }}
                className="w-full px-3 py-1.5 text-xs text-left text-zinc-400 hover:bg-[#252525] hover:text-white flex items-center gap-2"
              >
                <Flag className="w-3 h-3" />
                {s.name}
                {s.status === "active" && (
                  <span className="ml-auto text-[8px] text-emerald-400">Aktiv</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {task.assignee && (
        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-semibold shrink-0">
          {getInitials(task.assignee.name)}
        </div>
      )}
    </div>
  );
}

// ─── Sprint Karte ────────────────────────────────────────────────────────────

function SprintCard({ 
  sprint, 
  onStart, 
  onComplete, 
  onEdit, 
  onDelete 
}: { 
  sprint: SprintData;
  onStart: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusCfg = STATUS_CONFIG[sprint.status] ?? STATUS_CONFIG.planning;
  const totalTasks = sprint.tasks.length;
  const doneTasks = sprint.tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalSP = sprint.tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = sprint.tasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  
  const daysRemaining = sprint.endDate ? differenceInDays(new Date(sprint.endDate), new Date()) : null;

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href={`sprints/${sprint.id}`}
              className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors truncate"
            >
              {sprint.name}
            </Link>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0", statusCfg.color, statusCfg.bg)}>
              {statusCfg.label}
            </span>
          </div>
          {sprint.goal && (
            <p className="text-xs text-zinc-400 line-clamp-1 flex items-center gap-1">
              <Target className="w-3 h-3 shrink-0" />
              {sprint.goal}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-zinc-600 hover:text-white rounded hover:bg-[#252525]">
            <Edit2 className="w-3 h-3" />
          </button>
          {sprint.status === "planning" && (
            <button onClick={onStart} className="p-1.5 text-emerald-600 hover:text-emerald-400 rounded hover:bg-[#252525]">
              <Play className="w-3 h-3 fill-current" />
            </button>
          )}
          {sprint.status === "active" && (
            <button onClick={onComplete} className="p-1.5 text-blue-600 hover:text-blue-400 rounded hover:bg-[#252525]">
              <CheckCheck className="w-3 h-3" />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-[#252525]">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-zinc-500">Fortschritt</span>
          <span className="text-xs text-white font-semibold">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-sm font-bold text-white">{doneTasks}/{totalTasks}</div>
          <div className="text-[10px] text-zinc-500">Tasks</div>
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-400">{doneSP}/{totalSP}</div>
          <div className="text-[10px] text-zinc-500">Story Points</div>
        </div>
        <div>
          <div className={cn("text-sm font-bold", daysRemaining !== null && daysRemaining < 3 ? "text-red-400" : "text-white")}>
            {daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : "—"}
          </div>
          <div className="text-[10px] text-zinc-500">Tage übrig</div>
        </div>
      </div>

      {/* Dates */}
      {sprint.startDate && sprint.endDate && (
        <div className="mt-4 pt-3 border-t border-[#2a2a2a] text-[10px] text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(sprint.startDate), "d. MMM", { locale: de })} – {format(new Date(sprint.endDate), "d. MMM yyyy", { locale: de })}
        </div>
      )}

      {/* Retrospektive-Link für abgeschlossene Sprints */}
      {sprint.status === "completed" && (sprint.projectId ?? "") && (
        <div className="mt-3">
          <Link
            href={`/projects/${sprint.projectId}/retrospective?sprintId=${sprint.id}`}
            className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            Retrospektive öffnen
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Sprint Modal ────────────────────────────────────────────────────────────

function SprintModal({ 
  sprint, 
  projectId,
  onClose, 
  onSave 
}: { 
  sprint?: SprintData | null;
  projectId: string;
  onClose: () => void;
  onSave: (data: Partial<SprintData>) => Promise<void>;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const twoWeeks = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const [form, setForm] = useState({
    name: sprint?.name ?? "",
    goal: sprint?.goal ?? "",
    description: sprint?.description ?? "",
    startDate: sprint?.startDate ? sprint.startDate.slice(0, 10) : today,
    endDate: sprint?.endDate ? sprint.endDate.slice(0, 10) : twoWeeks,
    storyPoints: sprint?.storyPoints != null ? String(sprint.storyPoints) : "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const sp = parseInt(form.storyPoints, 10);
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        goal: form.goal.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        storyPoints: isNaN(sp) ? null : sp,
      } as Partial<SprintData>);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white">
            {sprint ? "Sprint bearbeiten" : "Neuer Sprint"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sprint 1.1"
              required
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Sprint-Ziel</label>
            <input
              type="text"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Was soll dieser Sprint erreichen?"
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details..."
              rows={2}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Startdatum</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Enddatum</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Geplante Story Points</label>
            <input
              type="number"
              min={0}
              value={form.storyPoints}
              onChange={(e) => setForm({ ...form, storyPoints: e.target.value })}
              placeholder="z.B. 40"
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
            >
              {loading ? "Speichern..." : sprint ? "Aktualisieren" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProjectSprintsClient({ project, initialSprints, initialBacklogTasks }: Props) {
  const [sprints, setSprints] = useState<SprintData[]>(initialSprints);
  const [backlogTasks, setBacklogTasks] = useState<TaskItem[]>(initialBacklogTasks);
  const [modalSprint, setModalSprint] = useState<SprintData | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"sprints" | "backlog">("sprints");

  // ─── Daten neu laden ───────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const [sprintsRes, backlogRes] = await Promise.all([
      fetch(`/api/sprints?projectId=${project.id}`),
      fetch(`/api/tasks?projectId=${project.id}&noSprint=true`),
    ]);
    if (sprintsRes.ok) {
      const data = await sprintsRes.json();
      if (Array.isArray(data)) setSprints(data);
    }
    if (backlogRes.ok) {
      const data = await backlogRes.json();
      if (Array.isArray(data)) setBacklogTasks(data);
    }
  }, [project.id]);

  // ─── Sprint Aktionen ───────────────────────────────────────────────────────

  const handleSave = async (data: Partial<SprintData>) => {
    const payload = { ...data, projectId: project.id };
    if (modalSprint?.id) {
      await fetch(`/api/sprints/${modalSprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await refresh();
  };

  const handleStart = async (sprintId: string) => {
    if (!confirm("Sprint starten?")) return;
    await fetch(`/api/sprints/${sprintId}/start`, { method: "POST" });
    await refresh();
  };

  const handleComplete = async (sprintId: string) => {
    if (!confirm("Sprint abschließen? Unerledigte Tasks werden ins Backlog verschoben.")) return;
    await fetch(`/api/sprints/${sprintId}/complete`, { method: "POST" });
    await refresh();
  };

  const handleDelete = async (sprintId: string) => {
    if (!confirm("Sprint löschen?")) return;
    await fetch(`/api/sprints/${sprintId}`, { method: "DELETE" });
    await refresh();
  };

  // ─── Task Sprint-Zuweisung ─────────────────────────────────────────────────

  const handleAssignTask = async (taskId: string, sprintId: string | null) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId }),
    });
    await refresh();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const activeSprints = sprints.filter((s) => s.status !== "completed" && s.status !== "cancelled");
  const completedSprints = sprints.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <div className="p-6 space-y-6">
      {/* Navigation */}
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Zurück zu {project.name}
      </Link>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-[#161616] rounded-lg p-1">
          <button
            onClick={() => setActiveTab("sprints")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
              activeTab === "sprints" ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Flag className="w-3.5 h-3.5" />
            Sprints ({activeSprints.length})
          </button>
          <button
            onClick={() => setActiveTab("backlog")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
              activeTab === "backlog" ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <List className="w-3.5 h-3.5" />
            Backlog ({backlogTasks.length})
          </button>
        </div>

        <button
          onClick={() => setModalSprint(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Neuer Sprint
        </button>
      </div>

      {/* Content */}
      {activeTab === "sprints" && (
        <div className="space-y-6">
          {/* Aktive Sprints */}
          {activeSprints.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  onStart={() => handleStart(sprint.id)}
                  onComplete={() => handleComplete(sprint.id)}
                  onEdit={() => setModalSprint(sprint)}
                  onDelete={() => handleDelete(sprint.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#161616] border border-[#2a2a2a] rounded-xl">
              <Flag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-1">Keine aktiven Sprints</p>
              <p className="text-zinc-600 text-xs mb-4">Erstelle deinen ersten Sprint für dieses Projekt.</p>
              <button
                onClick={() => setModalSprint(null)}
                className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                + Ersten Sprint erstellen
              </button>
            </div>
          )}

          {/* Abgeschlossene Sprints */}
          {completedSprints.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Abgeschlossene Sprints
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {completedSprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    onStart={() => {}}
                    onComplete={() => {}}
                    onEdit={() => setModalSprint(sprint)}
                    onDelete={() => handleDelete(sprint.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "backlog" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Projekt-Backlog</h3>
            <span className="text-xs text-zinc-500">
              {backlogTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)} Story Points gesamt
            </span>
          </div>

          {backlogTasks.length > 0 ? (
            <div className="space-y-1.5">
              {backlogTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAssign={handleAssignTask}
                  sprints={sprints}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-600 bg-[#161616] border border-[#2a2a2a] rounded-xl">
              <List className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Alle Tasks sind Sprints zugewiesen</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalSprint !== undefined && (
        <SprintModal
          sprint={modalSprint}
          projectId={project.id}
          onClose={() => setModalSprint(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
