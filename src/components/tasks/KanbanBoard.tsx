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
import { useAppStore, type Task, type Project, type User, type Sprint } from "@/store/useAppStore";
import { Flag } from "lucide-react";

const COLUMNS = [
  { id: "todo", title: "Todo", color: "bg-zinc-500" },
  { id: "in_progress", title: "In Progress", color: "bg-orange-500" },
  { id: "review", title: "Review", color: "bg-blue-500" },
  { id: "done", title: "Done", color: "bg-emerald-500" },
];

interface KanbanBoardProps {
  projects: Project[];
  users: User[];
  filteredTasks?: Task[];
}

export function KanbanBoard({ projects, users, filteredTasks }: KanbanBoardProps) {
  const { tasks, setTasks, updateTaskStatus } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");

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

  const baseTasks = filteredTasks ?? tasks;
  const displayTasks = selectedSprintId
    ? baseTasks.filter((t) => t.sprintId === selectedSprintId)
    : baseTasks;

  const getTasksByStatus = useCallback(
    (status: string) => displayTasks.filter((t) => t.status === status),
    [displayTasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if hovering over a column
    const isOverColumn = COLUMNS.some((c) => c.id === overId);
    if (isOverColumn && activeTask.status !== overId) {
      updateTaskStatus(activeId, overId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let newStatus = activeTask.status;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    if (targetColumn) {
      newStatus = targetColumn.id;
    } else {
      // Dropped on another task — use that task's column
      const targetTask = tasks.find((t) => t.id === overId);
      if (targetTask) newStatus = targetTask.status;
    }

    if (newStatus !== activeTask.status) {
      updateTaskStatus(activeId, newStatus);
      // Persist to API
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

  const handleSaveTask = async (data: Partial<Task> & { _labelIds?: string[] }) => {
    const { _labelIds, ...taskData } = data;
    if (editingTask && editingTask.id) {
      // Update
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
      }
    } else {
      // Create
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, status: newTaskStatus }),
      });
      if (res.ok) {
        const created = await res.json();
        // Assign labels to new task
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
          // Reload task with labels
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

  return (
    <>
      {/* Sprint filter */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
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
              ✕ Filter entfernen
            </button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              tasks={getTasksByStatus(col.id)}
              onAddTask={() => {
                setNewTaskStatus(col.id);
                setEditingTask(null);
              }}
              onTaskClick={(task) => setEditingTask(task)}
            />
          ))}
        </div>

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
    </>
  );
}
