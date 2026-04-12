"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TaskQuickEditPanel } from "./TaskQuickEditPanel";
import { BulkEditBar } from "./BulkEditBar";
import { useAppStore, type Task, type Project, type User, type Sprint } from "@/store/useAppStore";
import {
  Flag,
  Rows3,
  ChevronDown,
  ChevronRight,
  Settings2,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface BoardColumnDef {
  id: string;
  name: string;
  statusKey: string;
  order: number;
  wipLimit?: number | null;
  color: string;
  isDefault?: boolean;
}

type SwimlaneModus = "none" | "assignee" | "priority";

interface KanbanBoardProps {
  projects: Project[];
  users: User[];
  filteredTasks?: Task[];
  isAdmin?: boolean;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER = ["critical", "high", "medium", "low"];
const PRIORITY_LABELS: Record<string, string> = {
  critical: "🔴 Kritisch",
  high: "🔴 Hoch",
  medium: "🟡 Mittel",
  low: "🟢 Niedrig",
};

// ─── Spalten-Farben (für neue Spalten) ───────────────────────────────────────

const COLUMN_COLORS = [
  "#6b7280", "#f97316", "#3b82f6", "#10b981",
  "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4",
];

// ─── Swimlane-Header ──────────────────────────────────────────────────────────

function SwimlaneHeader({
  label,
  count,
  collapsed,
  onToggle,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 mb-3 group w-full text-left"
    >
      <div className="flex items-center gap-2 flex-1">
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        )}
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs text-zinc-600 bg-[#252525] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="h-px flex-1 bg-[#2a2a2a] ml-2" />
    </button>
  );
}

// ─── Spalten-Manager Modal ────────────────────────────────────────────────────

function ColumnManagerModal({
  columns,
  onClose,
  onSave,
  onAdd,
  onDelete,
}: {
  columns: BoardColumnDef[];
  onClose: () => void;
  onSave: (col: BoardColumnDef) => Promise<void>;
  onAdd: (name: string, statusKey: string, wipLimit: number | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWip, setEditWip] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newWip, setNewWip] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEditStart = (col: BoardColumnDef) => {
    setEditing(col.id);
    setEditName(col.name);
    setEditWip(col.wipLimit != null ? String(col.wipLimit) : "");
  };

  const handleEditSave = async (col: BoardColumnDef) => {
    setSaving(true);
    await onSave({
      ...col,
      name: editName,
      wipLimit: editWip ? parseInt(editWip) : null,
    });
    setEditing(null);
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newKey.trim()) return;
    setSaving(true);
    await onAdd(
      newName.trim(),
      newKey.trim().toLowerCase().replace(/\s+/g, "_"),
      newWip ? parseInt(newWip) : null
    );
    setNewName("");
    setNewKey("");
    setNewWip("");
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] sm:rounded-xl rounded-t-2xl w-full sm:max-w-lg shadow-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-slide-up sm:animate-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Board-Spalten konfigurieren</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {columns.map((col) => (
            <div
              key={col.id}
              className="bg-[#252525] border border-[#3a3a3a] rounded-lg p-3"
            >
              {editing === col.id ? (
                <div className="space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Spaltenname"
                    className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editWip}
                      onChange={(e) => setEditWip(e.target.value)}
                      placeholder="WIP-Limit (leer = kein Limit)"
                      className="flex-1 bg-[#1c1c1c] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                      min="1"
                    />
                    <button
                      onClick={() => handleEditSave(col)}
                      disabled={saving}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Speichern
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="p-1 text-zinc-600 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-xs text-white">{col.name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      [{col.statusKey}]
                    </span>
                    {col.wipLimit != null && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                        WIP: {col.wipLimit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditStart(col)}
                      className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!col.isDefault && (
                      <button
                        onClick={() => onDelete(col.id)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Neue Spalte */}
          <div className="border border-dashed border-[#3a3a3a] rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
              + Neue Spalte
            </p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (z.B. Blockiert)"
                className="flex-1 bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white focus:outline-none"
              />
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key (z.B. blocked)"
                className="flex-1 bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={newWip}
                onChange={(e) => setNewWip(e.target.value)}
                placeholder="WIP-Limit (optional)"
                className="flex-1 bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                min="1"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim() || !newKey.trim()}
                className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded transition-colors"
              >
                <Plus className="w-3 h-3" /> Hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function KanbanBoard({ projects, users, filteredTasks, isAdmin }: KanbanBoardProps) {
  const { tasks, setTasks, updateTaskStatus } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo");
  const [sprints, setSprints] = useState<Sprint[]>([]);

  // Quick-Edit Panel
  const [quickEditTask, setQuickEditTask] = useState<Task | null>(null);

  // Batch-Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const handleSelectTask = (id: string, selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleClearSelection = () => setSelectedTaskIds(new Set());

  // Inline-Save Handler
  const handleInlineSave = async (id: string, data: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => t.id === id ? { ...t, ...updated } : t));
    }
  };

  // Quick-Edit Panel Update Handler
  const handleQuickEditUpdate = async (id: string, data: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => t.id === id ? { ...t, ...updated } : t));
    }
  };

  // Bulk-Update Handler
  const handleBulkUpdate = async (ids: string[], data: Partial<Task>) => {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then(async (res) => {
          if (res.ok) {
            const updated = await res.json();
            return updated;
          }
          return null;
        })
      )
    );
    // Refresh tasks from store
    const updatedTasks = tasks.map((t) =>
      ids.includes(t.id) ? { ...t, ...data } : t
    );
    setTasks(updatedTasks);
  };
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");

  // Swimlanes
  const [swimlaneModus, setSwimlaneModus] = useState<SwimlaneModus>("none");
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  // Dynamische Board-Spalten
  const [columns, setColumns] = useState<BoardColumnDef[]>([]);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(true);

  // Spalten von API laden
  useEffect(() => {
    fetch("/api/board-columns")
      .then((r) => r.json())
      .then((data: BoardColumnDef[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setColumns(data.sort((a, b) => a.order - b.order));
        }
      })
      .catch(() => {
        // Fallback zu Defaults
        setColumns([
          { id: "default-todo", name: "Todo", statusKey: "todo", order: 0, color: "#6b7280" },
          { id: "default-in_progress", name: "In Bearbeitung", statusKey: "in_progress", order: 1, color: "#f97316" },
          { id: "default-review", name: "Review", statusKey: "review", order: 2, color: "#3b82f6" },
          { id: "default-done", name: "Fertig", statusKey: "done", order: 3, color: "#10b981" },
        ]);
      })
      .finally(() => setColumnsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((data: Sprint[]) => { if (Array.isArray(data)) setSprints(data); })
      .catch(() => {});
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const baseTasks = Array.isArray(filteredTasks) ? filteredTasks : Array.isArray(tasks) ? tasks : [];
  const displayTasks = selectedSprintId
    ? baseTasks.filter((t) => t.sprintId === selectedSprintId)
    : baseTasks;

  // Aufgaben nach Status filtern (mit dynamischen Spalten)
  const getTasksByStatus = useCallback(
    (status: string, taskList?: Task[]) =>
      (taskList ?? displayTasks).filter((t) => t.status === status),
    [displayTasks]
  );

  // Swimlane-Gruppen berechnen
  const getSwimlaneGroups = useCallback((): { key: string; label: string; tasks: Task[] }[] => {
    if (swimlaneModus === "none") return [];

    if (swimlaneModus === "assignee") {
      const groups: Record<string, { label: string; tasks: Task[] }> = {};
      for (const task of displayTasks) {
        const key = task.assigneeId ?? "unassigned";
        const label = task.assignee?.name ?? "Nicht zugewiesen";
        if (!groups[key]) groups[key] = { label, tasks: [] };
        groups[key].tasks.push(task);
      }
      // Unassigned zuletzt
      const sorted = Object.entries(groups).sort(([a], [b]) => {
        if (a === "unassigned") return 1;
        if (b === "unassigned") return -1;
        return 0;
      });
      return sorted.map(([key, { label, tasks }]) => ({ key, label, tasks }));
    }

    if (swimlaneModus === "priority") {
      const groups: Record<string, Task[]> = {};
      for (const task of displayTasks) {
        const key = task.priority ?? "medium";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      }
      return PRIORITY_ORDER
        .filter((p) => groups[p]?.length > 0)
        .map((p) => ({ key: p, label: PRIORITY_LABELS[p] ?? p, tasks: groups[p] }));
    }

    return [];
  }, [swimlaneModus, displayTasks]);

  const toggleLane = (key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Column-ID extrahieren (auch bei Swimlane-IDs wie "assignee-key:col-id")
    const colId = overId.includes(":") ? overId.split(":").pop()! : overId;
    const isOverColumn = columns.some((c) => c.statusKey === colId || c.id === colId);
    if (isOverColumn && activeTaskItem.status !== colId) {
      updateTaskStatus(activeId, colId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    let newStatus = activeTaskItem.status;

    // Column-ID extrahieren
    const colId = overId.includes(":") ? overId.split(":").pop()! : overId;
    const targetColumn = columns.find((c) => c.statusKey === colId || c.id === colId);
    if (targetColumn) {
      newStatus = targetColumn.statusKey;
    } else {
      const targetTask = tasks.find((t) => t.id === overId);
      if (targetTask) newStatus = targetTask.status;
    }

    if (newStatus !== activeTaskItem.status) {
      updateTaskStatus(activeId, newStatus);
      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (e) {
        console.error("Failed to update task status", e);
      }
    }
  };

  // ─── Task CRUD ────────────────────────────────────────────────────────────

  const handleSaveTask = async (data: Partial<Task> & { _labelIds?: string[] }) => {
    const { _labelIds, ...taskData } = data;
    if (editingTask && editingTask.id) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
      } else if (res.status === 422) {
        const errorData = await res.json();
        if (errorData.blockerActive) {
          throw new Error(errorData.error || "Task ist blockiert und kann nicht auf Erledigt gesetzt werden.");
        }
      }
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, status: newTaskStatus }),
      });
      if (res.ok) {
        const created = await res.json();

        // "Startet erst nach" → Abhängigkeit automatisch anlegen
        const startAfterTaskId = (taskData as Record<string, unknown>).startAfterTaskId as string | undefined;
        if (startAfterTaskId) {
          await fetch("/api/tasks/dependencies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: created.id, dependsOnId: startAfterTaskId, isBlocker: false }),
          }).catch(() => {});
        }

        if (_labelIds && _labelIds.length > 0) {
          await Promise.all(
            _labelIds.map((labelId) =>
              fetch(`/api/tasks/${created.id}/labels`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ labelId }),
              })
            )
          );
          const refreshed = await fetch(`/api/tasks/${created.id}`).then((r) => r.json());
          setTasks([...tasks, refreshed]);
        } else {
          setTasks([...tasks, created]);
        }
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  // ─── Spalten-Management ───────────────────────────────────────────────────

  const handleSaveColumn = async (col: BoardColumnDef) => {
    if (col.isDefault) {
      // Default-Spalte → zuerst in DB anlegen, dann updaten
      const res = await fetch("/api/board-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: col.name,
          statusKey: col.statusKey,
          order: col.order,
          wipLimit: col.wipLimit,
          color: col.color,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setColumns((prev) =>
          prev.map((c) => (c.id === col.id ? { ...created } : c))
        );
      }
      return;
    }
    const res = await fetch(`/api/board-columns/${col.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: col.name,
        wipLimit: col.wipLimit,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setColumns((prev) => prev.map((c) => (c.id === col.id ? updated : c)));
    }
  };

  const handleAddColumn = async (name: string, statusKey: string, wipLimit: number | null) => {
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    const color = COLUMN_COLORS[columns.length % COLUMN_COLORS.length];
    const res = await fetch("/api/board-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, statusKey, order: maxOrder, wipLimit, color }),
    });
    if (res.ok) {
      const created = await res.json();
      setColumns((prev) => [...prev, created].sort((a, b) => a.order - b.order));
    }
  };

  const handleDeleteColumn = async (id: string) => {
    const col = columns.find((c) => c.id === id);
    if (col?.isDefault) return; // Default nicht löschbar
    const res = await fetch(`/api/board-columns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const swimlaneGroups = getSwimlaneGroups();

  return (
    <>
      {/* Spalten-Manager Modal */}
      {columnManagerOpen && (
        <ColumnManagerModal
          columns={columns}
          onClose={() => setColumnManagerOpen(false)}
          onSave={handleSaveColumn}
          onAdd={handleAddColumn}
          onDelete={handleDeleteColumn}
        />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {/* Sprint-Filter */}
        {sprints.length > 0 && (
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500">Sprint:</span>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Alle Tasks</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
            {selectedSprintId && (
              <button
                onClick={() => setSelectedSprintId("")}
                className="text-xs text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Swimlanes Toggle */}
        <div className="flex items-center gap-1.5">
          <Rows3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">Swimlanes:</span>
          <div className="flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-0.5">
            {(["none", "assignee", "priority"] as SwimlaneModus[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSwimlaneModus(m);
                  setCollapsedLanes(new Set());
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  swimlaneModus === m
                    ? "bg-[#2a2a2a] text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m === "none" ? "Aus" : m === "assignee" ? "Zuständig" : "Priorität"}
              </button>
            ))}
          </div>
        </div>

        {/* Spalten konfigurieren (nur Admin) */}
        {isAdmin && (
          <button
            onClick={() => setColumnManagerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] rounded-lg transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Spalten
          </button>
        )}
      </div>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {swimlaneModus === "none" ? (
          // Standard-Ansicht ohne Swimlanes
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.statusKey}
                title={col.name}
                color=""
                tasks={getTasksByStatus(col.statusKey)}
                wipLimit={col.wipLimit}
                onAddTask={() => {
                  setNewTaskStatus(col.statusKey);
                  setEditingTask(null);
                }}
                onTaskClick={(task) => setEditingTask(task)}
                onQuickEdit={(task) => setQuickEditTask(task)}
                selectedTaskIds={selectedTaskIds}
                onSelectTask={handleSelectTask}
                onInlineSave={handleInlineSave}
              />
            ))}
          </div>
        ) : (
          // Swimlane-Ansicht
          <div className="h-full overflow-y-auto overflow-x-auto pb-4 space-y-6">
            {swimlaneGroups.map((lane) => (
              <div key={lane.key}>
                <SwimlaneHeader
                  label={lane.label}
                  count={lane.tasks.length}
                  collapsed={collapsedLanes.has(lane.key)}
                  onToggle={() => toggleLane(lane.key)}
                />
                {!collapsedLanes.has(lane.key) && (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {columns.map((col) => {
                      const laneTasks = lane.tasks.filter(
                        (t) => t.status === col.statusKey
                      );
                      return (
                        <KanbanColumn
                          key={`${lane.key}-${col.id}`}
                          id={`${lane.key}:${col.statusKey}`}
                          title={col.name}
                          color=""
                          tasks={laneTasks}
                          wipLimit={col.wipLimit}
                          onAddTask={() => {
                            setNewTaskStatus(col.statusKey);
                            setEditingTask(null);
                          }}
                          onTaskClick={(task) => setEditingTask(task)}
                          onQuickEdit={(task) => setQuickEditTask(task)}
                          selectedTaskIds={selectedTaskIds}
                          onSelectTask={handleSelectTask}
                          onInlineSave={handleInlineSave}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {swimlaneGroups.length === 0 && (
              <p className="text-center text-zinc-600 text-sm py-12">
                Keine Tasks vorhanden
              </p>
            )}
          </div>
        )}

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {editingTask !== undefined && (
        <TaskModal
          task={editingTask}
          initialStatus={newTaskStatus}
          projects={projects}
          users={users}
          onClose={() => setEditingTask(undefined)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Quick-Edit Side Panel */}
      {quickEditTask && (
        <TaskQuickEditPanel
          task={quickEditTask}
          users={users}
          onClose={() => setQuickEditTask(null)}
          onUpdate={handleQuickEditUpdate}
        />
      )}

      {/* Bulk-Edit Bar */}
      {selectedTaskIds.size > 0 && (
        <BulkEditBar
          selectedIds={selectedTaskIds}
          tasks={tasks}
          users={users}
          onClearSelection={handleClearSelection}
          onBulkUpdate={handleBulkUpdate}
        />
      )}
    </>
  );
}
