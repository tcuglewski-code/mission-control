"use client";

import { useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  Flag, ChevronLeft, CheckCheck, Target, Clock, TrendingUp,
  GripVertical, Plus, X, ArrowLeft
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

interface SprintData {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  storyPoints: number | null;
  completedPoints: number | null;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  tasks: TaskItem[];
}

interface Props {
  sprint: SprintData;
  backlogTasks: TaskItem[];
}

// ─── Konstanten ──────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "todo", label: "Todo", color: "#3b82f6", statuses: ["todo", "backlog"] },
  { id: "in_progress", label: "In Progress", color: "#f59e0b", statuses: ["in_progress"] },
  { id: "in_review", label: "In Review", color: "#8b5cf6", statuses: ["in_review"] },
  { id: "done", label: "Done", color: "#10b981", statuses: ["done"] },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  low: { color: "text-zinc-400", bg: "bg-zinc-700/50 border-zinc-600/30" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: "Planung", color: "text-blue-400" },
  active: { label: "Aktiv", color: "text-emerald-400" },
  completed: { label: "Abgeschlossen", color: "text-zinc-400" },
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getColumnForStatus(status: string): string {
  const col = COLUMNS.find((c) => c.statuses.includes(status));
  return col?.id ?? "todo";
}

// ─── Draggable Task Card ─────────────────────────────────────────────────────

function DraggableTaskCard({ task, isDragging }: { task: TaskItem; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all",
        isDragging ? "opacity-50 shadow-xl border-emerald-500/40" : "hover:border-[#3a3a3a]"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3 h-3 text-zinc-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white leading-snug mb-2">{task.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium", priorityCfg.bg, priorityCfg.color)}>
              {task.priority}
            </span>
            {task.storyPoints != null && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a2a2a] text-zinc-400 font-mono">
                {task.storyPoints} SP
              </span>
            )}
            {task.assignee && (
              <div className="ml-auto w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-semibold">
                {getInitials(task.assignee.name)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({ 
  id, 
  label, 
  color, 
  tasks 
}: { 
  id: string; 
  label: string; 
  color: string; 
  tasks: TaskItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  return (
    <div className="flex-1 min-w-[220px]">
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

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[200px] rounded-xl p-2 space-y-2 transition-all border-2",
          isOver
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-dashed border-[#2a2a2a] bg-[#161616]"
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[10px] text-zinc-700">
            {isOver ? "Loslassen zum Ablegen" : "Keine Tasks"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Tasks Modal ─────────────────────────────────────────────────────────

function AddTasksModal({ 
  backlogTasks, 
  onAdd, 
  onClose 
}: { 
  backlogTasks: TaskItem[];
  onAdd: (taskIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white">Tasks zum Sprint hinzufügen</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {backlogTasks.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-8">Keine Tasks im Backlog</p>
          ) : (
            <div className="space-y-1.5">
              {backlogTasks.map((task) => (
                <label
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                    selected.has(task.id)
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={() => toggle(task.id)}
                    className="w-4 h-4 rounded border-zinc-600 bg-[#252525] text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                  {task.storyPoints != null && (
                    <span className="text-[10px] text-zinc-500 font-mono">{task.storyPoints} SP</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a2a]">
          <span className="text-xs text-zinc-500">{selected.size} ausgewählt</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SprintBoardClient({ sprint: initialSprint, backlogTasks: initialBacklog }: Props) {
  const [sprint, setSprint] = useState(initialSprint);
  const [backlogTasks, setBacklogTasks] = useState(initialBacklog);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ─── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sprints/${sprint.id}`);
    if (res.ok) {
      const data = await res.json();
      setSprint(data);
    }
    const backlogRes = await fetch(`/api/tasks?projectId=${sprint.projectId}&noSprint=true`);
    if (backlogRes.ok) {
      const data = await backlogRes.json();
      if (Array.isArray(data)) setBacklogTasks(data);
    }
  }, [sprint.id, sprint.projectId]);

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);
    if (!over) return;

    const taskId = String(active.id);
    const targetColumn = String(over.id);

    // Status mapping
    const statusMap: Record<string, string> = {
      todo: "todo",
      in_progress: "in_progress",
      in_review: "in_review",
      done: "done",
    };

    const newStatus = statusMap[targetColumn];
    if (!newStatus) return;

    // Optimistic update
    setSprint((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    }));

    // API Update
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  // ─── Sprint abschließen ────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!confirm("Sprint abschließen? Unerledigte Tasks werden ins Backlog verschoben.")) return;
    await fetch(`/api/sprints/${sprint.id}/complete`, { method: "POST" });
    await refresh();
  };

  // ─── Tasks hinzufügen ──────────────────────────────────────────────────────

  const handleAddTasks = async (taskIds: string[]) => {
    await Promise.all(
      taskIds.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sprintId: sprint.id }),
        })
      )
    );
    await refresh();
  };

  // ─── Task aus Sprint entfernen ─────────────────────────────────────────────

  const handleRemoveTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId: null }),
    });
    await refresh();
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const sprintTasks = sprint.tasks ?? [];
  const totalTasks = sprintTasks.length;
  const doneTasks = sprintTasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalSP = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = sprintTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const daysRemaining = sprint.endDate ? differenceInDays(new Date(sprint.endDate), new Date()) : null;

  const draggedTask = draggedTaskId ? sprintTasks.find((t) => t.id === draggedTaskId) : null;

  // Column tasks
  const columnTasks = COLUMNS.map((col) => ({
    ...col,
    tasks: sprintTasks.filter((t) => col.statuses.includes(t.status)),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Navigation */}
      <Link
        href={`/projects/${sprint.projectId}/sprints`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Zurück zu Sprints
      </Link>

      {/* Sprint Header */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Flag className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg font-bold text-white">{sprint.name}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_CONFIG[sprint.status]?.color ?? "text-zinc-400")}>
                {STATUS_CONFIG[sprint.status]?.label ?? sprint.status}
              </span>
            </div>
            {sprint.goal && (
              <p className="text-sm text-zinc-400 flex items-center gap-1.5 ml-8">
                <Target className="w-3.5 h-3.5" />
                {sprint.goal}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tasks hinzufügen
            </button>
            {sprint.status === "active" && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Sprint abschließen
              </button>
            )}
            {sprint.status === "completed" && sprint.projectId && (
              <Link
                href={`/projects/${sprint.projectId}/retrospective?sprintId=${sprint.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Retrospektive
              </Link>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-zinc-500">Fortschritt</span>
            <span className="text-xs text-white font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{doneTasks}/{totalTasks}</div>
            <div className="text-[10px] text-zinc-500">Tasks erledigt</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">{doneSP}/{totalSP}</div>
            <div className="text-[10px] text-zinc-500">Story Points</div>
          </div>
          <div className="text-center">
            <div className={cn("text-xl font-bold", daysRemaining !== null && daysRemaining < 3 ? "text-red-400" : "text-white")}>
              {daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : "—"}
            </div>
            <div className="text-[10px] text-zinc-500">Tage übrig</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">
              {sprintTasks.filter((t) => t.status === "in_progress").length}
            </div>
            <div className="text-[10px] text-zinc-500">In Bearbeitung</div>
          </div>
        </div>

        {/* Dates */}
        {sprint.startDate && sprint.endDate && (
          <div className="mt-4 pt-3 border-t border-[#2a2a2a] text-xs text-zinc-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(sprint.startDate), "d. MMMM", { locale: de })} – {format(new Date(sprint.endDate), "d. MMMM yyyy", { locale: de })}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columnTasks.map((col) => (
            <DroppableColumn
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              tasks={col.tasks}
            />
          ))}
        </div>
        <DragOverlay>
          {draggedTask && (
            <div className="opacity-90 rotate-1 scale-105">
              <DraggableTaskCard task={draggedTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add Tasks Modal */}
      {showAddModal && (
        <AddTasksModal
          backlogTasks={backlogTasks}
          onAdd={handleAddTasks}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
