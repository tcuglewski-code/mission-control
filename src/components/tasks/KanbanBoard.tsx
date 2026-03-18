"use client";

import { useState, useCallback } from "react";
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
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { useAppStore, type Task, type Project, type User } from "@/store/useAppStore";

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "bg-zinc-500" },
  { id: "in_progress", title: "In Bearbeitung", color: "bg-orange-500" },
  { id: "in_review", title: "In Prüfung", color: "bg-blue-500" },
  { id: "done", title: "Erledigt", color: "bg-emerald-500" },
];

interface KanbanBoardProps {
  projects: Project[];
  users: User[];
}

export function KanbanBoard({ projects, users }: KanbanBoardProps) {
  const { tasks, setTasks, updateTaskStatus } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("backlog");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const getTasksByStatus = useCallback(
    (status: string) => tasks.filter((t) => t.status === status),
    [tasks]
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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (e) {
        console.error("Failed to update task status", e);
      }
    }
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    if (editingTask && editingTask.id) {
      // Update
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
        body: JSON.stringify({ ...data, status: newTaskStatus }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks([...tasks, created]);
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
