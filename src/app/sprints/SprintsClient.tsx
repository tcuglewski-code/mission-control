"use client";

import { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, startOfDay, isAfter } from "date-fns";
import { de } from "date-fns/locale";
import {
  Flag, Plus, Play, CheckCheck, Trash2, Edit2, X, BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sprint, Project } from "@/store/useAppStore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planning: { label: "Planung", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  active: { label: "Aktiv", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  completed: { label: "Abgeschlossen", cls: "bg-zinc-700/50 text-zinc-400 border border-zinc-600/20" },
};

// ─── Typen ───────────────────────────────────────────────────────────────────

interface ExtendedTask {
  id: string;
  status: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ExtendedSprint extends Sprint {
  tasks: ExtendedTask[];
  project?: { id: string; name: string; color: string } | null;
}

// ─── Burndown-Chart ──────────────────────────────────────────────────────────

/** Berechnet Burndown-Daten aus Sprint-Tasks */
function buildBurndownData(sprint: ExtendedSprint) {
  if (!sprint.startDate || !sprint.endDate) return [];

  const start = startOfDay(new Date(sprint.startDate));
  const end = startOfDay(new Date(sprint.endDate));
  const today = startOfDay(new Date());

  // Alle Tage des Sprints
  const days = eachDayOfInterval({ start, end });
  const total = sprint.tasks.length;

  // Ideal-Linie: linear von total auf 0
  const idealPerDay = total / Math.max(days.length - 1, 1);

  return days.map((day, i) => {
    // Tatsächlich offen an diesem Tag: alle Tasks, deren updatedAt NACH diesem Tag liegt
    // oder die noch nicht "done" sind
    const offen = sprint.tasks.filter((t) => {
      if (t.status !== "done") return true;
      // Task wurde nach diesem Datum abgeschlossen → noch offen an diesem Tag
      if (t.updatedAt) {
        const doneDay = startOfDay(new Date(t.updatedAt));
        return isAfter(doneDay, day);
      }
      return false;
    }).length;

    const isInFuture = isAfter(day, today);

    return {
      tag: format(day, "d. MMM", { locale: de }),
      ideal: Math.round(total - idealPerDay * i),
      aktuell: isInFuture ? null : offen,
    };
  });
}

// Tooltip für Burndown
function BurndownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-3 text-xs">
      <p className="text-zinc-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        p.value !== null && (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "ideal" ? "Ideal" : "Aktuell"}: {p.value} Tasks
          </p>
        )
      ))}
    </div>
  );
}

interface BurndownChartProps {
  sprint: ExtendedSprint;
}

function BurndownChart({ sprint }: BurndownChartProps) {
  const data = buildBurndownData(sprint);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 text-xs">
        Kein Zeitraum definiert — Start- und Enddatum für Burndown-Chart benötigt.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
        <BarChart2 className="w-3.5 h-3.5" />
        Burndown-Chart — {sprint.tasks.length} Tasks gesamt
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="tag"
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<BurndownTooltip />} />
          {/* Ideal-Linie */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#3f3f46"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={1.5}
            name="Ideal"
          />
          {/* Tatsächlich */}
          <Line
            type="monotone"
            dataKey="aktuell"
            stroke="#10b981"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            name="Aktuell"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-end">
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="w-6 h-0.5 bg-zinc-600 inline-block border-dashed border" /> Ideal
        </span>
        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
          <span className="w-6 h-0.5 bg-emerald-500 inline-block" /> Aktuell
        </span>
      </div>
    </div>
  );
}

// ─── Sprint Modal ────────────────────────────────────────────────────────────

interface SprintModalProps {
  sprint?: Sprint | null;
  projects: Project[];
  onClose: () => void;
  onSave: (data: Partial<Sprint>) => Promise<void>;
}

function SprintModal({ sprint, projects, onClose, onSave }: SprintModalProps) {
  const [form, setForm] = useState({
    name: sprint?.name ?? "",
    description: sprint?.description ?? "",
    goal: sprint?.goal ?? "",
    startDate: sprint?.startDate ? format(new Date(sprint.startDate), "yyyy-MM-dd") : "",
    endDate: sprint?.endDate ? format(new Date(sprint.endDate), "yyyy-MM-dd") : "",
    projectId: sprint?.projectId ?? "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        goal: form.goal.trim() || null,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
        projectId: form.projectId || null,
      });
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
            <label className="text-xs text-zinc-400 mb-1 block">Ziel</label>
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
            <label className="text-xs text-zinc-400 mb-1 block">Projekt</label>
            <select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Kein Projekt</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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

// ─── Sprint Card ─────────────────────────────────────────────────────────────

interface SprintCardProps {
  sprint: ExtendedSprint;
  onEdit: () => void;
  onStart: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

function SprintCard({ sprint, onEdit, onStart, onComplete, onDelete }: SprintCardProps) {
  const [showBurndown, setShowBurndown] = useState(false);
  const tasks = sprint.tasks ?? [];
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const badge = STATUS_BADGE[sprint.status] ?? STATUS_BADGE.planning;

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-sm font-semibold text-white">{sprint.name}</h3>
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", badge.cls)}>
          {badge.label}
        </span>
      </div>

      {/* Ziel */}
      {sprint.goal && (
        <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{sprint.goal}</p>
      )}

      {/* Projekt-Badge */}
      {sprint.project && (
        <div className="mb-3">
          <span
            className="text-[10px] px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${sprint.project.color}20`,
              color: sprint.project.color,
            }}
          >
            {sprint.project.name}
          </span>
        </div>
      )}

      {/* Datumsbereich */}
      {(sprint.startDate || sprint.endDate) && (
        <div className="text-xs text-zinc-500 mb-3">
          {sprint.startDate && format(new Date(sprint.startDate), "d. MMM", { locale: de })}
          {sprint.startDate && sprint.endDate && " – "}
          {sprint.endDate && format(new Date(sprint.endDate), "d. MMM yyyy", { locale: de })}
        </div>
      )}

      {/* Fortschrittsbalken */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">{doneTasks}/{totalTasks} Tasks</span>
          <span className="text-[11px] text-zinc-400">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Burndown-Chart ein-/ausklappen */}
      {totalTasks > 0 && (
        <button
          onClick={() => setShowBurndown((v) => !v)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 py-1 mb-3 rounded hover:bg-[#252525] transition-colors"
        >
          <BarChart2 className="w-3 h-3" />
          {showBurndown ? "Chart ausblenden" : "Burndown-Chart"}
        </button>
      )}

      {showBurndown && <BurndownChart sprint={sprint} />}

      {/* Aktionen */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#252525] transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Bearbeiten
        </button>

        {sprint.status === "planning" && (
          <button
            onClick={onStart}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Sprint starten
          </button>
        )}

        {sprint.status === "active" && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
          >
            <CheckCheck className="w-3 h-3" />
            Abschließen
          </button>
        )}

        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors ml-auto"
        >
          <Trash2 className="w-3 h-3" />
          Löschen
        </button>
      </div>
    </div>
  );
}

// ─── Main SprintsClient ──────────────────────────────────────────────────────

export function SprintsClient() {
  const [sprints, setSprints] = useState<ExtendedSprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSprint, setModalSprint] = useState<Sprint | null | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("");

  const fetchSprints = useCallback(async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/sprints${params}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Sprints", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: Project[]) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
  }, []);

  const handleSave = async (data: Partial<Sprint>) => {
    if (modalSprint?.id) {
      const res = await fetch(`/api/sprints/${modalSprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) await fetchSprints();
    } else {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) await fetchSprints();
    }
  };

  const handleStart = async (sprintId: string) => {
    if (!confirm("Sprint starten?")) return;
    const res = await fetch(`/api/sprints/${sprintId}/start`, { method: "POST" });
    if (res.ok) fetchSprints();
  };

  const handleComplete = async (sprintId: string) => {
    if (!confirm("Sprint abschließen?")) return;
    const res = await fetch(`/api/sprints/${sprintId}/complete`, { method: "POST" });
    if (res.ok) fetchSprints();
  };

  const handleDelete = async (sprintId: string) => {
    if (!confirm("Sprint löschen? Tasks bleiben erhalten, werden nur vom Sprint getrennt.")) return;
    const res = await fetch(`/api/sprints/${sprintId}`, { method: "DELETE" });
    if (res.ok) fetchSprints();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">Sprints</h1>
          <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded-full">
            {sprints.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Alle Status</option>
            <option value="planning">Planung</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
          </select>

          <button
            onClick={() => setModalSprint(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Sprint
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600 text-sm">Lade Sprints...</div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-16">
          <Flag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Noch keine Sprints vorhanden</p>
          <button
            onClick={() => setModalSprint(null)}
            className="mt-4 px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            + Ersten Sprint erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onEdit={() => setModalSprint(sprint)}
              onStart={() => handleStart(sprint.id)}
              onComplete={() => handleComplete(sprint.id)}
              onDelete={() => handleDelete(sprint.id)}
            />
          ))}
        </div>
      )}

      {/* Erstellungs-/Bearbeitungs-Modal */}
      {modalSprint !== undefined && (
        <SprintModal
          sprint={modalSprint}
          projects={projects}
          onClose={() => setModalSprint(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
