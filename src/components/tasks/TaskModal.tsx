"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Task, Project, User, Sprint } from "@/store/useAppStore";
import { TaskTimer } from "./TaskTimer";

interface TaskModalProps {
  task?: Task | null;
  initialStatus?: string;
  projects: Project[];
  users: User[];
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function TaskModal({
  task,
  initialStatus = "backlog",
  projects,
  users,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: initialStatus,
    priority: "medium",
    labels: "",
    dueDate: "",
    startDate: "",
    agentPrompt: "",
    projectId: "",
    assigneeId: "",
    sprintId: "",
  });
  const [loading, setLoading] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  useEffect(() => {
    // Load active sprints for dropdown
    fetch("/api/sprints?status=active")
      .then((r) => r.json())
      .then((data: Sprint[]) => {
        if (Array.isArray(data)) setSprints(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        labels: task.labels ?? "",
        dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
        startDate: task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd") : "",
        agentPrompt: task.agentPrompt ?? "",
        projectId: task.projectId ?? "",
        assigneeId: task.assigneeId ?? "",
        sprintId: task.sprintId ?? "",
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await onSave({
        ...form,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        startDate: form.startDate ? new Date(form.startDate) : null,
        agentPrompt: form.agentPrompt || null,
        projectId: form.projectId || null,
        assigneeId: form.assigneeId || null,
        sprintId: form.sprintId || null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!confirm("Task wirklich löschen?")) return;
    setLoading(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#1c1c1c] z-10">
          <h2 className="text-sm font-semibold text-white">
            {task ? "Task bearbeiten" : "Neuer Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task-Titel..."
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details..."
              rows={3}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="in_review">In Prüfung</option>
                <option value="done">Erledigt</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Priorität</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Project + Sprint */}
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
              <label className="text-xs text-zinc-400 mb-1 block">Sprint</label>
              <select
                value={form.sprintId}
                onChange={(e) => setForm({ ...form, sprintId: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Kein Sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Zugewiesen</label>
            <select
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Niemand</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Labels + DueDate + StartDate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Labels</label>
              <input
                type="text"
                value={form.labels}
                onChange={(e) => setForm({ ...form, labels: e.target.value })}
                placeholder="frontend,api,bug"
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fällig am</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Startdatum</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Agent Prompt */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Agent-Prompt</label>
            <textarea
              value={form.agentPrompt}
              onChange={(e) => setForm({ ...form, agentPrompt: e.target.value })}
              placeholder="Anweisungen für den Agenten..."
              rows={3}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
            />
          </div>

          {/* Zeiterfassung Timer (nur bei bestehendem Task) */}
          {task && (
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">⏱ Zeiterfassung</label>
              <div className="bg-[#171717] border border-[#2a2a2a] rounded-lg p-3">
                <TaskTimer taskId={task.id} taskTitle={task.title} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {task && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Löschen
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !form.title.trim()}
                className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
              >
                {loading ? "Speichern..." : task ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
