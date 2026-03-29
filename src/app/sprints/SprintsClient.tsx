"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  Flag, Plus, Play, CheckCheck, Trash2, Edit2, X, BarChart2,
  Zap, ChevronDown, Check, GripVertical, List, Kanban, TrendingUp,
  AlertCircle, Clock, ArrowRight, Sparkles, Loader2, CheckCircle2, ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

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
  updatedAt?: string;
  createdAt?: string;
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
  projectId: string | null;
  storyPoints: number | null;
  completedPoints: number | null;
  memberIds: string | null;   // JSON array of user IDs
  project: Project | null;
  tasks: TaskItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Konstanten ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Kritisch", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  high: { label: "Hoch", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  medium: { label: "Mittel", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  low: { label: "Niedrig", color: "text-zinc-400", bg: "bg-zinc-700/50 border-zinc-600/30" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: "Planung", color: "text-blue-400" },
  active: { label: "Aktiv", color: "text-emerald-400" },
  completed: { label: "Abgeschlossen", color: "text-zinc-400" },
};

// Kanban-Spalten Konfiguration
const BOARD_COLUMNS = [
  { id: "backlog", label: "Backlog", color: "#6b7280", statusValues: [] as string[], isBacklog: true },
  { id: "todo", label: "Sprint Aktiv", color: "#3b82f6", statusValues: ["todo", "backlog"], isBacklog: false },
  { id: "in_progress", label: "In Progress", color: "#f59e0b", statusValues: ["in_progress"], isBacklog: false },
  { id: "done", label: "Done", color: "#10b981", statusValues: ["done"], isBacklog: false },
] as const;

type ColumnId = "backlog" | "todo" | "in_progress" | "done";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getTaskColumn(task: TaskItem, activeSprint: SprintData | null): ColumnId {
  if (!task.sprintId || !activeSprint || task.sprintId !== activeSprint.id) return "backlog";
  if (task.status === "done") return "done";
  if (task.status === "in_progress") return "in_progress";
  return "todo";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Prioritäts-Badge ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ─── Assignee Avatar ──────────────────────────────────────────────────────────

function Avatar({ assignee, size = "sm" }: { assignee: Assignee | null; size?: "sm" | "xs" }) {
  const sz = size === "xs" ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]";
  if (!assignee) return null;
  if (assignee.avatar) {
    return <img src={assignee.avatar} alt={assignee.name} className={cn("rounded-full object-cover", sz)} />;
  }
  return (
    <div className={cn("rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold shrink-0", sz)}>
      {getInitials(assignee.name)}
    </div>
  );
}

// ─── Story Points Inline-Edit ─────────────────────────────────────────────────

function StoryPointsEdit({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value ?? ""));
  const ref = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    const num = parseInt(input, 10);
    onChange(isNaN(num) || num < 0 ? null : num);
    setEditing(false);
  };

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        min={0}
        max={99}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") setEditing(false); }}
        className="w-10 bg-[#2a2a2a] border border-emerald-500/50 rounded px-1 text-xs text-white text-center focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => { setInput(String(value ?? "")); setEditing(true); }}
      className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-zinc-400 hover:text-white transition-colors font-mono border border-transparent hover:border-zinc-600"
      title="Story Points bearbeiten"
    >
      {value != null ? `${value} SP` : "— SP"}
    </button>
  );
}

// ─── Task Card (draggable) ────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskItem;
  sprints: SprintData[];
  activeSprint: SprintData | null;
  onStoryPointsChange: (taskId: string, sp: number | null) => void;
  onSprintAssign: (taskId: string, sprintId: string | null) => void;
  isDragging?: boolean;
}

function TaskCard({ task, sprints, activeSprint, onStoryPointsChange, onSprintAssign, isDragging }: TaskCardProps) {
  const [showSprintPicker, setShowSprintPicker] = useState(false);

  return (
    <div className={cn(
      "bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-3 space-y-2 select-none transition-all",
      isDragging ? "opacity-50 shadow-xl border-emerald-500/40" : "hover:border-[#3a3a3a]"
    )}>
      {/* Titel */}
      <p className="text-xs text-white leading-snug font-medium">{task.title}</p>

      {/* Badges Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={task.priority} />
        <StoryPointsEdit
          value={task.storyPoints}
          onChange={(v) => onStoryPointsChange(task.id, v)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Sprint Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSprintPicker((v) => !v)}
            className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Flag className="w-3 h-3" />
            <span className="truncate max-w-[80px]">
              {task.sprintId
                ? sprints.find((s) => s.id === task.sprintId)?.name ?? "Sprint"
                : "Backlog"}
            </span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showSprintPicker && (
            <div className="absolute bottom-full left-0 mb-1 w-44 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg shadow-xl z-50 py-1">
              <button
                onClick={() => { onSprintAssign(task.id, null); setShowSprintPicker(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#252525] hover:text-white"
              >
                {!task.sprintId && <Check className="w-3 h-3 text-emerald-400" />}
                <span className={!task.sprintId ? "ml-0" : "ml-5"}>Backlog</span>
              </button>
              {sprints.filter((s) => s.status !== "completed").map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onSprintAssign(task.id, s.id); setShowSprintPicker(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#252525] hover:text-white"
                >
                  {task.sprintId === s.id && <Check className="w-3 h-3 text-emerald-400" />}
                  <span className={task.sprintId === s.id ? "ml-0" : "ml-5"} title={s.name}>{s.name}</span>
                  {s.status === "active" && (
                    <span className="ml-auto text-[8px] text-emerald-400 bg-emerald-500/10 px-1 rounded">Aktiv</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Avatar assignee={task.assignee} size="xs" />
      </div>
    </div>
  );
}

// ─── Draggable Task Card Wrapper ──────────────────────────────────────────────

function DraggableTaskCard({ task, ...props }: TaskCardProps & { task: TaskItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div ref={setNodeRef} {...attributes} className="cursor-grab active:cursor-grabbing">
      <div {...listeners} className="flex items-start gap-1">
        <div className="mt-2.5 text-zinc-700 hover:text-zinc-500 shrink-0">
          <GripVertical className="w-3 h-3" />
        </div>
        <div className="flex-1">
          <TaskCard task={task} {...props} isDragging={isDragging} />
        </div>
      </div>
    </div>
  );
}

// ─── Kanban-Spalte (droppable) ────────────────────────────────────────────────

interface KanbanColumnProps {
  columnId: ColumnId;
  label: string;
  color: string;
  tasks: TaskItem[];
  sprints: SprintData[];
  activeSprint: SprintData | null;
  onStoryPointsChange: (taskId: string, sp: number | null) => void;
  onSprintAssign: (taskId: string, sprintId: string | null) => void;
}

function KanbanColumn({ columnId, label, color, tasks, sprints, activeSprint, onStoryPointsChange, onSprintAssign }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  return (
    <div className="flex-1 min-w-[200px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
        <span className="ml-auto text-[10px] text-zinc-600 bg-[#252525] px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
        {totalSP > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono">{totalSP} SP</span>
        )}
      </div>

      {/* Drop-Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[120px] rounded-xl p-2 space-y-2 transition-all border-2",
          isOver
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-dashed border-[#2a2a2a] bg-[#161616]"
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            sprints={sprints}
            activeSprint={activeSprint}
            onStoryPointsChange={onStoryPointsChange}
            onSprintAssign={onSprintAssign}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-zinc-700">
            {isOver ? "Loslassen zum Ablegen" : "Leer"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Velocity Chart ───────────────────────────────────────────────────────────

function VelocityChart({ sprints }: { sprints: SprintData[] }) {
  const completed = sprints
    .filter((s) => s.status === "completed")
    .slice(-6)
    .map((s) => ({
      name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
      Geplant: s.storyPoints ?? 0,
      Erledigt: s.completedPoints ?? 0,
    }));

  if (completed.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Noch keine abgeschlossenen Sprints</p>
          <p className="text-xs mt-1">Schließe Sprints ab, um Velocity zu tracken</p>
        </div>
      </div>
    );
  }

  const avgVelocity = Math.round(
    completed.reduce((s, d) => s + d.Erledigt, 0) / completed.length
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-white">Velocity (letzte 6 Sprints)</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
          <Zap className="w-3 h-3" />
          ⌀ {avgVelocity} SP/Sprint
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={completed} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 8 }}
            labelStyle={{ color: "#e5e7eb", fontSize: 12 }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
          <Bar dataKey="Geplant" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.6} />
          <Bar dataKey="Erledigt" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Quick Add Task Modal ──────────────────────────────────────────────────

interface QuickAddTaskModalProps {
  sprintId: string;
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}

function QuickAddTaskModal({ sprintId, projects, onClose, onCreated }: QuickAddTaskModalProps) {
  const [form, setForm] = useState({
    title: "",
    priority: "medium" as string,
    storyPoints: "",
    projectId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const sp = parseInt(form.storyPoints, 10);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          priority: form.priority,
          storyPoints: isNaN(sp) ? null : sp,
          projectId: form.projectId || null,
          sprintId,
          status: "todo",
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white">Quick Add Task</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task-Titel *"
            autoFocus
            required
            className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="critical">🔴 Kritisch</option>
              <option value="high">🟠 Hoch</option>
              <option value="medium">🟡 Mittel</option>
              <option value="low">⚪ Niedrig</option>
            </select>
            <input
              type="number"
              min={0}
              max={99}
              value={form.storyPoints}
              onChange={(e) => setForm({ ...form, storyPoints: e.target.value })}
              placeholder="SP"
              className="bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
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
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="w-full px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
          >
            {loading ? "Erstellen..." : "Task erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Backlog Assign Modal ─────────────────────────────────────────────────────

interface BacklogAssignModalProps {
  sprintId: string;
  sprintName: string;
  backlogTasks: TaskItem[];
  onClose: () => void;
  onAssigned: () => void;
}

function BacklogAssignModal({ sprintId, sprintName, backlogTasks, onClose, onAssigned }: BacklogAssignModalProps) {
  const [assigning, setAssigning] = useState<string | null>(null);

  const handleAssign = async (taskId: string) => {
    setAssigning(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
      if (res.ok) {
        onAssigned();
      }
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-sm font-semibold text-white">Backlog Tasks zuweisen</h2>
            <p className="text-xs text-zinc-500 mt-0.5">→ {sprintName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {backlogTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Tasks im Backlog</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backlogTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors"
                >
                  <PriorityBadge priority={task.priority} />
                  <p className="text-xs text-white flex-1 truncate">{task.title}</p>
                  {task.storyPoints != null && (
                    <span className="text-[10px] text-zinc-500 font-mono">{task.storyPoints} SP</span>
                  )}
                  <button
                    onClick={() => handleAssign(task.id)}
                    disabled={assigning === task.id}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  >
                    {assigning === task.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Zuweisen
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Tasks Modal ───────────────────────────────────────────────────────────

interface AIGeneratedTask {
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  storyPoints: number;
  category: string;
  selected?: boolean;
  created?: boolean;
  creating?: boolean;
}

interface AITasksModalProps {
  sprint: SprintData;
  projects: Project[];
  onClose: () => void;
  onTasksCreated: () => void;
}

function AITasksModal({ sprint, projects, onClose, onTasksCreated }: AITasksModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<AIGeneratedTask[]>([]);
  const [summary, setSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch("/api/ai/sprint-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sprintName: sprint.name,
            sprintDescription: sprint.description,
            sprintGoal: sprint.goal,
            projectName: sprint.project?.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Fehler bei AI-Generierung");
          return;
        }
        setTasks(data.tasks.map((t: AIGeneratedTask) => ({ ...t, selected: true })));
        setSummary(data.summary);
      } catch (err) {
        setError("Verbindungsfehler");
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [sprint]);

  const toggleTask = (index: number) => {
    setTasks((prev) => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  };

  const toggleAll = () => {
    const allSelected = tasks.every((t) => t.selected);
    setTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  };

  const handleCreate = async () => {
    const selected = tasks.filter((t) => t.selected && !t.created);
    if (selected.length === 0) return;
    setCreating(true);
    setCreatedCount(0);

    for (let i = 0; i < selected.length; i++) {
      const task = selected[i];
      const idx = tasks.findIndex((t) => t.title === task.title);
      setTasks((prev) => prev.map((t, j) => j === idx ? { ...t, creating: true } : t));

      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            priority: task.priority,
            storyPoints: task.storyPoints,
            sprintId: sprint.id,
            projectId: sprint.projectId,
            status: "todo",
          }),
        });
        setTasks((prev) => prev.map((t, j) => j === idx ? { ...t, created: true, creating: false } : t));
        setCreatedCount((c) => c + 1);
      } catch {
        setTasks((prev) => prev.map((t, j) => j === idx ? { ...t, creating: false } : t));
      }
    }

    setCreating(false);
    onTasksCreated();
    setTimeout(onClose, 500);
  };

  const selectedCount = tasks.filter((t) => t.selected && !t.created).length;
  const totalSP = tasks.filter((t) => t.selected).reduce((s, t) => s + t.storyPoints, 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">KI-generierte Tasks</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
              <p className="text-sm text-zinc-400">Generiere Tasks für "{sprint.name}"...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {summary && (
                <p className="text-xs text-zinc-400 mb-4 bg-[#161616] p-3 rounded-lg border border-[#2a2a2a]">
                  {summary}
                </p>
              )}

              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleAll}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  {tasks.every((t) => t.selected) ? "Alle abwählen" : "Alle auswählen"}
                </button>
                <span className="text-xs text-zinc-500">
                  {selectedCount} ausgewählt · {totalSP} SP
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task, idx) => (
                  <div
                    key={idx}
                    onClick={() => !task.created && toggleTask(idx)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                      task.created
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : task.selected
                        ? "bg-[#1e1e1e] border-purple-500/30 hover:border-purple-500/50"
                        : "bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a] opacity-60"
                    )}
                  >
                    <div className="mt-0.5">
                      {task.created ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : task.creating ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : (
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center",
                          task.selected ? "border-purple-400 bg-purple-400" : "border-zinc-600"
                        )}>
                          {task.selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <PriorityBadge priority={task.priority} />
                        <span className="text-[10px] text-zinc-500 font-mono">{task.storyPoints} SP</span>
                        <span className="text-[10px] text-zinc-600 bg-[#252525] px-1.5 py-0.5 rounded">{task.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2a2a]">
            {creating ? (
              <span className="text-xs text-purple-400">
                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                {createdCount}/{selectedCount} erstellt...
              </span>
            ) : (
              <span className="text-xs text-zinc-500">{tasks.filter((t) => t.created).length} Tasks erstellt</span>
            )}
            <button
              onClick={handleCreate}
              disabled={creating || selectedCount === 0}
              className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              {selectedCount} Tasks erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sprint Modal ─────────────────────────────────────────────────────────────

interface TeamUserMin {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  weeklyCapacity?: number;
}

interface SprintModalProps {
  sprint?: SprintData | null;
  projects: Project[];
  onClose: () => void;
  onSave: (data: Partial<SprintData>) => Promise<void>;
}

function SprintModal({ sprint, projects, onClose, onSave }: SprintModalProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const twoWeeks = format(addDays(new Date(), 14), "yyyy-MM-dd");

  // Sprint memberIds parsen
  let initialMemberIds: string[] = [];
  try {
    if ((sprint as any)?.memberIds) initialMemberIds = JSON.parse((sprint as any).memberIds);
  } catch {}

  const [form, setForm] = useState({
    name: sprint?.name ?? "",
    goal: sprint?.goal ?? "",
    description: sprint?.description ?? "",
    startDate: sprint?.startDate ? sprint.startDate.slice(0, 10) : today,
    endDate: sprint?.endDate ? sprint.endDate.slice(0, 10) : twoWeeks,
    projectId: sprint?.projectId ?? "",
    storyPoints: sprint?.storyPoints != null ? String(sprint.storyPoints) : "",
  });
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds);
  const [teamUsers, setTeamUsers] = useState<TeamUserMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);

  // Team laden
  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.ok ? r.json() : [])
      .then(setTeamUsers)
      .catch(() => {});
  }, []);

  // Kapazitäts-Check bei Sprint-Tasks
  const checkCapacity = useCallback((selectedIds: string[]) => {
    const spTotal = parseInt(form.storyPoints, 10) || 0;
    if (spTotal === 0 || selectedIds.length === 0) {
      setCapacityWarning(null);
      return;
    }
    const spPerMember = spTotal / selectedIds.length;
    const hoursPerMember = spPerMember * 2; // 1 SP = 2h
    const warnings = selectedIds
      .map((id) => teamUsers.find((u) => u.id === id))
      .filter(Boolean)
      .filter((u) => {
        const cap = u!.weeklyCapacity ?? 40;
        return (hoursPerMember / cap) > 0.8;
      })
      .map((u) => u!.name);
    setCapacityWarning(warnings.length > 0
      ? `⚠ Überlastung: ${warnings.join(", ")} (>80% Kapazität)`
      : null);
  }, [form.storyPoints, teamUsers]);

  const toggleMember = (userId: string) => {
    const updated = memberIds.includes(userId)
      ? memberIds.filter((id) => id !== userId)
      : [...memberIds, userId];
    setMemberIds(updated);
    checkCapacity(updated);
  };

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
        projectId: form.projectId || null,
        storyPoints: isNaN(sp) ? null : sp,
        memberIds: memberIds.length > 0 ? memberIds : null,
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
              <label className="text-xs text-zinc-400 mb-1 block">Enddatum (default: +2 Wochen)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Team-Mitglieder */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Team-Mitglieder</label>
            {teamUsers.length === 0 ? (
              <p className="text-xs text-zinc-600">Lade Teammitglieder...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teamUsers.map((u) => {
                  const isSelected = memberIds.includes(u.id);
                  const emoji = u.avatar ?? (u.role === "agent" ? "🤖" : "👤");
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-[#252525] border-[#3a3a3a] text-zinc-400 hover:border-[#4a4a4a]"
                      }`}>
                      <span>{emoji}</span>
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {capacityWarning && (
              <p className="text-xs text-orange-400 mt-2">{capacityWarning}</p>
            )}
            {memberIds.length > 0 && (
              <p className="text-[10px] text-zinc-600 mt-1">{memberIds.length} Mitglied(er) zugewiesen</p>
            )}
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

// ─── Sprint Selektor ──────────────────────────────────────────────────────────

function SprintSelector({
  sprints,
  selected,
  onSelect,
}: {
  sprints: SprintData[];
  selected: SprintData | null;
  onSelect: (s: SprintData | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white hover:border-[#3a3a3a] transition-colors min-w-[180px]"
      >
        <Flag className="w-3.5 h-3.5 text-emerald-400" />
        <span className="truncate">{selected?.name ?? "Sprint auswählen"}</span>
        {selected && (
          <span className={cn("text-[9px] ml-1", STATUS_CONFIG[selected.status]?.color)}>
            ({STATUS_CONFIG[selected.status]?.label})
          </span>
        )}
        <ChevronDown className="w-3 h-3 ml-auto text-zinc-500" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 py-1">
          {sprints.filter((s) => s.status !== "completed").map((s) => (
            <button
              key={s.id}
              onClick={() => { onSelect(s); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[#252525] transition-colors"
            >
              {selected?.id === s.id && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
              <span className={cn("text-white truncate", selected?.id === s.id ? "" : "ml-5")}>{s.name}</span>
              <span className={cn("ml-auto text-[9px] shrink-0", STATUS_CONFIG[s.status]?.color)}>
                {STATUS_CONFIG[s.status]?.label}
              </span>
            </button>
          ))}
          {sprints.filter((s) => s.status !== "completed").length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-600">Keine aktiven Sprints</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main SprintsClient ──────────────────────────────────────────────────────

export function SprintsClient() {
  const [sprints, setSprints] = useState<SprintData[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSprint, setModalSprint] = useState<SprintData | null | undefined>(undefined);
  const [activeSprint, setActiveSprint] = useState<SprintData | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "velocity" | "backlog">("board");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([]);
  
  // Neue Modals
  const [quickAddSprintId, setQuickAddSprintId] = useState<string | null>(null);
  const [backlogAssignSprint, setBacklogAssignSprint] = useState<SprintData | null>(null);
  const [aiTasksSprint, setAiTasksSprint] = useState<SprintData | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ─── Laden ──────────────────────────────────────────────────────────────────

  const fetchSprints = useCallback(async () => {
    try {
      const res = await fetch("/api/sprints");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSprints(data);
          // Aktiven Sprint vorselektieren
          const active = data.find((s: SprintData) => s.status === "active");
          setActiveSprint((prev) => prev ? (data.find((s: SprintData) => s.id === prev.id) ?? active ?? data[0] ?? null) : (active ?? data.find((s: SprintData) => s.status === "planning") ?? null));
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Sprints", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllTasks(data);
          setLocalTasks(data);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Tasks", err);
    }
  }, []);

  useEffect(() => {
    fetchSprints();
    fetchTasks();
    fetch("/api/projects").then((r) => r.json()).then((data: Project[]) => {
      if (Array.isArray(data)) setProjects(data);
    }).catch(() => {});
    // Check AI config
    fetch("/api/ai/sprint-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sprintName: "__check__" }) })
      .then((r) => setAiConfigured(r.status !== 503))
      .catch(() => setAiConfigured(false));
  }, [fetchSprints, fetchTasks]);

  // ─── Lokale Tasks updaten wenn Sprint sich ändert ─────────────────────────

  useEffect(() => {
    setLocalTasks(allTasks);
  }, [allTasks]);

  // ─── Sprint Aktionen ──────────────────────────────────────────────────────

  const handleSave = async (data: Partial<SprintData>) => {
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
      if (res.ok) {
        await fetchSprints();
      }
    }
  };

  const handleStart = async (sprintId: string) => {
    if (!confirm("Sprint starten? Tasks im Sprint werden auf 'In Progress' gesetzt.")) return;
    const res = await fetch(`/api/sprints/${sprintId}/start`, { method: "POST" });
    if (res.ok) { await fetchSprints(); await fetchTasks(); }
  };

  const handleComplete = async (sprintId: string) => {
    if (!confirm("Sprint abschließen? Nicht-Done Tasks werden zurück ins Backlog verschoben.")) return;
    const res = await fetch(`/api/sprints/${sprintId}/complete`, { method: "POST" });
    if (res.ok) { await fetchSprints(); await fetchTasks(); }
  };

  const handleDelete = async (sprintId: string) => {
    if (!confirm("Sprint löschen? Tasks bleiben erhalten und werden ins Backlog verschoben.")) return;
    const res = await fetch(`/api/sprints/${sprintId}`, { method: "DELETE" });
    if (res.ok) { await fetchSprints(); await fetchTasks(); }
  };

  // ─── Story Points ändern ──────────────────────────────────────────────────

  const handleStoryPointsChange = async (taskId: string, sp: number | null) => {
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, storyPoints: sp } : t));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyPoints: sp }),
    });
  };

  // ─── Sprint Assignment ────────────────────────────────────────────────────

  const handleSprintAssign = async (taskId: string, sprintId: string | null) => {
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sprintId } : t));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId }),
    });
    await fetchSprints(); // Sprint Task-Count aktualisieren
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);
    if (!over) return;

    const taskId = String(active.id);
    const targetColumn = String(over.id) as ColumnId;
    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Ermitteln was geändert werden muss
    let newStatus: string | undefined;
    let newSprintId: string | null | undefined;

    if (targetColumn === "backlog") {
      newSprintId = null;
      newStatus = "todo";
    } else if (targetColumn === "todo") {
      newSprintId = activeSprint?.id ?? task.sprintId;
      newStatus = "todo";
    } else if (targetColumn === "in_progress") {
      newSprintId = activeSprint?.id ?? task.sprintId;
      newStatus = "in_progress";
    } else if (targetColumn === "done") {
      newSprintId = activeSprint?.id ?? task.sprintId;
      newStatus = "done";
    }

    if (newStatus === undefined) return;

    // Optimistic Update
    setLocalTasks((prev) => prev.map((t) =>
      t.id === taskId
        ? { ...t, status: newStatus!, sprintId: newSprintId !== undefined ? newSprintId : t.sprintId }
        : t
    ));

    // API Update
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newSprintId !== undefined) updateData.sprintId = newSprintId;

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    await fetchSprints();
  };

  // ─── Board-Spalten Daten ──────────────────────────────────────────────────

  const boardColumns = BOARD_COLUMNS.map((col) => {
    let tasks: TaskItem[];
    if (col.isBacklog) {
      // Backlog: alle Tasks ohne Sprint-Zuweisung oder nicht im aktiven Sprint
      tasks = localTasks.filter((t) => !t.sprintId || (activeSprint && t.sprintId !== activeSprint.id));
    } else {
      // Sprint-Spalten: Tasks im aktiven Sprint mit passendem Status
      tasks = activeSprint
        ? localTasks.filter((t) => t.sprintId === activeSprint.id && col.statusValues.includes(t.status as never))
        : [];
    }
    return { ...col, tasks };
  });

  const draggedTask = draggedTaskId ? localTasks.find((t) => t.id === draggedTaskId) ?? null : null;

  // ─── Sprint Stats für aktiven Sprint ─────────────────────────────────────

  const activeSprintTasks = activeSprint
    ? localTasks.filter((t) => t.sprintId === activeSprint.id)
    : [];
  const doneTasks = activeSprintTasks.filter((t) => t.status === "done").length;
  const totalSP = activeSprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = activeSprintTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e1e] flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#161616] rounded-lg p-1">
          {[
            { id: "board" as const, label: "Board", Icon: Kanban },
            { id: "velocity" as const, label: "Velocity", Icon: TrendingUp },
            { id: "backlog" as const, label: "Backlog", Icon: List },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
                activeTab === id
                  ? "bg-[#252525] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Sprint Selector (nur im Board) */}
        {activeTab === "board" && (
          <SprintSelector
            sprints={sprints}
            selected={activeSprint}
            onSelect={setActiveSprint}
          />
        )}

        {/* Sprint Actions */}
        {activeTab === "board" && activeSprint && (
          <div className="flex items-center gap-2">
            {activeSprint.status === "planning" && (
              <button
                onClick={() => handleStart(activeSprint.id)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Sprint starten
              </button>
            )}
            {activeSprint.status === "active" && (
              <button
                onClick={() => handleComplete(activeSprint.id)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Sprint abschließen
              </button>
            )}
          </div>
        )}

        {/* Neuer Sprint Button */}
        <button
          onClick={() => setModalSprint(null)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Neuer Sprint
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-16 text-zinc-600 text-sm">Lade Daten...</div>
        ) : (
          <>
            {/* ── Board Tab ── */}
            {activeTab === "board" && (
              <div>
                {/* Sprint Stats Bar */}
                {activeSprint && (
                  <div className="flex items-center gap-6 mb-6 p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Sprint</p>
                      <p className="text-sm font-semibold text-white">{activeSprint.name}</p>
                    </div>
                    {activeSprint.goal && (
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-500 mb-0.5">Ziel</p>
                        <p className="text-xs text-zinc-300 truncate">{activeSprint.goal}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Tasks</p>
                      <p className="text-sm font-semibold text-white">{doneTasks}/{activeSprintTasks.length}</p>
                    </div>
                    {totalSP > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 mb-0.5">Story Points</p>
                        <p className="text-sm font-semibold text-emerald-400">{doneSP}/{totalSP} SP</p>
                      </div>
                    )}
                    {activeSprint.startDate && activeSprint.endDate && (
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-500 mb-0.5">Zeitraum</p>
                        <p className="text-xs text-zinc-300">
                          {format(new Date(activeSprint.startDate), "d. MMM", { locale: de })} –{" "}
                          {format(new Date(activeSprint.endDate), "d. MMM", { locale: de })}
                        </p>
                      </div>
                    )}
                    {(() => {
                      let mIds: string[] = [];
                      try { if (activeSprint.memberIds) mIds = JSON.parse(activeSprint.memberIds); } catch {}
                      if (mIds.length === 0) return null;
                      return (
                        <div className="text-center">
                          <p className="text-[10px] text-zinc-500 mb-1">Team</p>
                          <div className="flex items-center gap-1 justify-center">
                            {mIds.slice(0, 5).map((id) => (
                              <span key={id} className="w-6 h-6 rounded-full bg-zinc-700 border border-[#2a2a2a] text-xs flex items-center justify-center" title={id}>
                                👤
                              </span>
                            ))}
                            {mIds.length > 5 && <span className="text-[10px] text-zinc-500">+{mIds.length - 5}</span>}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2 ml-auto">
                      {/* KI-Tasks generieren */}
                      <button
                        onClick={() => aiConfigured && setAiTasksSprint(activeSprint)}
                        disabled={!aiConfigured}
                        title={aiConfigured ? "KI-Tasks generieren" : "KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt)"}
                        className={cn(
                          "flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors",
                          aiConfigured
                            ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20"
                            : "text-zinc-600 cursor-not-allowed border border-zinc-700"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        KI-Tasks
                      </button>
                      {/* + Task */}
                      <button
                        onClick={() => setQuickAddSprintId(activeSprint.id)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                        title="Task hinzufügen"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Task
                      </button>
                      {/* Backlog zuweisen */}
                      <button
                        onClick={() => setBacklogAssignSprint(activeSprint)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded-lg hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
                        title="Backlog Tasks zuweisen"
                      >
                        <ListTodo className="w-3.5 h-3.5" />
                        Backlog
                      </button>
                      <button
                        onClick={() => setModalSprint(activeSprint)}
                        className="text-xs text-zinc-500 hover:text-white p-1.5 rounded hover:bg-[#252525] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(activeSprint.id)}
                        className="text-xs text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-[#252525] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Kanban Board */}
                {!activeSprint ? (
                  <div className="text-center py-16">
                    <Flag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm mb-1">Kein Sprint ausgewählt</p>
                    <p className="text-zinc-600 text-xs">Erstelle einen neuen Sprint oder wähle einen aus.</p>
                    <button
                      onClick={() => setModalSprint(null)}
                      className="mt-4 px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                    >
                      + Ersten Sprint erstellen
                    </button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {boardColumns.map((col) => (
                        <KanbanColumn
                          key={col.id}
                          columnId={col.id as ColumnId}
                          label={col.label}
                          color={col.color}
                          tasks={col.tasks}
                          sprints={sprints}
                          activeSprint={activeSprint}
                          onStoryPointsChange={handleStoryPointsChange}
                          onSprintAssign={handleSprintAssign}
                        />
                      ))}
                    </div>
                    <DragOverlay>
                      {draggedTask && (
                        <div className="opacity-90 rotate-1 scale-105">
                          <TaskCard
                            task={draggedTask}
                            sprints={sprints}
                            activeSprint={activeSprint}
                            onStoryPointsChange={() => {}}
                            onSprintAssign={() => {}}
                          />
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            )}

            {/* ── Velocity Tab ── */}
            {activeTab === "velocity" && (
              <div className="max-w-3xl">
                <VelocityChart sprints={sprints} />

                {/* Sprint-Tabelle */}
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-white mb-4">Alle Sprints</h3>
                  <div className="space-y-2">
                    {sprints.length === 0 && (
                      <p className="text-zinc-600 text-sm text-center py-8">Noch keine Sprints vorhanden</p>
                    )}
                    {sprints.map((sprint) => {
                      const sprintTasks = localTasks.filter((t) => t.sprintId === sprint.id);
                      const sprintDone = sprintTasks.filter((t) => t.status === "done").length;
                      const progress = sprintTasks.length === 0 ? 0 : Math.round((sprintDone / sprintTasks.length) * 100);
                      const badge = STATUS_CONFIG[sprint.status] ?? STATUS_CONFIG.planning;
                      return (
                        <div key={sprint.id} className="flex items-center gap-4 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl hover:border-[#3a3a3a] transition-colors">
                          <Flag className="w-4 h-4 text-zinc-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-white truncate">{sprint.name}</p>
                              <span className={cn("text-[9px] font-medium", badge.color)}>• {badge.label}</span>
                            </div>
                            <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden w-full max-w-xs">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-zinc-300 font-mono">{sprintDone}/{sprintTasks.length} Tasks</p>
                            {(sprint.storyPoints || sprint.completedPoints) && (
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {sprint.completedPoints ?? 0}/{sprint.storyPoints ?? "?"} SP
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModalSprint(sprint)} className="p-1.5 text-zinc-600 hover:text-white rounded hover:bg-[#252525]"><Edit2 className="w-3 h-3" /></button>
                            {sprint.status === "planning" && (
                              <button onClick={() => handleStart(sprint.id)} className="p-1.5 text-emerald-600 hover:text-emerald-400 rounded hover:bg-[#252525]"><Play className="w-3 h-3 fill-current" /></button>
                            )}
                            {sprint.status === "active" && (
                              <button onClick={() => handleComplete(sprint.id)} className="p-1.5 text-blue-600 hover:text-blue-400 rounded hover:bg-[#252525]"><CheckCheck className="w-3 h-3" /></button>
                            )}
                            <button onClick={() => handleDelete(sprint.id)} className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-[#252525]"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Backlog Tab ── */}
            {activeTab === "backlog" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Backlog</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {localTasks.filter((t) => !t.sprintId).length} Tasks ohne Sprint-Zuweisung
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {localTasks.filter((t) => !t.sprintId).length === 0 && (
                    <div className="text-center py-12 text-zinc-600">
                      <List className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Alle Tasks sind einem Sprint zugewiesen</p>
                    </div>
                  )}
                  {localTasks.filter((t) => !t.sprintId).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl hover:border-[#2a2a2a] transition-colors group">
                      <PriorityBadge priority={task.priority} />
                      <p className="text-xs text-white flex-1 truncate">{task.title}</p>

                      <StoryPointsEdit
                        value={task.storyPoints}
                        onChange={(v) => handleStoryPointsChange(task.id, v)}
                      />

                      {/* Sprint zuweisen */}
                      <div className="flex items-center gap-1">
                        {sprints.filter((s) => s.status !== "completed").map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSprintAssign(task.id, s.id)}
                            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors border border-transparent hover:border-emerald-500/20 opacity-0 group-hover:opacity-100"
                          >
                            <ArrowRight className="w-3 h-3" />
                            {s.name}
                          </button>
                        ))}
                      </div>

                      <Avatar assignee={task.assignee} size="xs" />
                    </div>
                  ))}
                </div>

                {/* Tasks mit Sprint-Zuweisung */}
                {sprints.filter((s) => s.status !== "completed").map((sprint) => {
                  const sprintTasks = localTasks.filter((t) => t.sprintId === sprint.id);
                  if (sprintTasks.length === 0) return null;
                  return (
                    <div key={sprint.id} className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Flag className="w-3.5 h-3.5 text-emerald-400" />
                        <h4 className="text-xs font-semibold text-zinc-300">{sprint.name}</h4>
                        <span className={cn("text-[9px]", STATUS_CONFIG[sprint.status]?.color)}>
                          ({STATUS_CONFIG[sprint.status]?.label})
                        </span>
                        <span className="text-[10px] text-zinc-600 bg-[#252525] px-1.5 py-0.5 rounded-full ml-1">
                          {sprintTasks.length}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono ml-1">
                          {sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)} SP
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {sprintTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl hover:border-[#2a2a2a] transition-colors group">
                            <PriorityBadge priority={task.priority} />
                            <p className="text-xs text-white flex-1 truncate">{task.title}</p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded border font-medium",
                              task.status === "done"
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : task.status === "in_progress"
                                ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                                : "text-zinc-400 bg-zinc-700/50 border-zinc-600/20"
                            )}>
                              {task.status === "done" ? "Done" : task.status === "in_progress" ? "In Progress" : "Todo"}
                            </span>
                            <StoryPointsEdit
                              value={task.storyPoints}
                              onChange={(v) => handleStoryPointsChange(task.id, v)}
                            />
                            <button
                              onClick={() => handleSprintAssign(task.id, null)}
                              className="text-[10px] text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              title="Aus Sprint entfernen"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <Avatar assignee={task.assignee} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {modalSprint !== undefined && (
        <SprintModal
          sprint={modalSprint}
          projects={projects}
          onClose={() => setModalSprint(undefined)}
          onSave={handleSave}
        />
      )}

      {/* Quick Add Task Modal */}
      {quickAddSprintId && (
        <QuickAddTaskModal
          sprintId={quickAddSprintId}
          projects={projects}
          onClose={() => setQuickAddSprintId(null)}
          onCreated={() => { fetchTasks(); fetchSprints(); }}
        />
      )}

      {/* Backlog Assign Modal */}
      {backlogAssignSprint && (
        <BacklogAssignModal
          sprintId={backlogAssignSprint.id}
          sprintName={backlogAssignSprint.name}
          backlogTasks={localTasks.filter((t) => !t.sprintId && t.status === "todo")}
          onClose={() => setBacklogAssignSprint(null)}
          onAssigned={() => { fetchTasks(); fetchSprints(); }}
        />
      )}

      {/* AI Tasks Modal */}
      {aiTasksSprint && (
        <AITasksModal
          sprint={aiTasksSprint}
          projects={projects}
          onClose={() => setAiTasksSprint(null)}
          onTasksCreated={() => { fetchTasks(); fetchSprints(); }}
        />
      )}
    </div>
  );
}
