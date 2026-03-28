"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, MessageSquare, Send, Tag } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { Task, Project, User, Sprint, Label } from "@/store/useAppStore";
import { TaskTimer } from "./TaskTimer";

interface TaskComment {
  id: string;
  content: string;
  authorName: string;
  authorEmail?: string | null;
  createdAt: string;
}

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
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);

  // Kommentar-State
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Amadeus");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load active sprints for dropdown
    fetch("/api/sprints?status=active")
      .then((r) => r.json())
      .then((data: Sprint[]) => {
        if (Array.isArray(data)) setSprints(data);
      })
      .catch(() => {});

    // Load available labels
    fetch("/api/labels")
      .then((r) => r.json())
      .then((data: Label[]) => {
        if (Array.isArray(data)) setAvailableLabels(data);
      })
      .catch(() => {});
  }, []);

  // Kommentare laden wenn Task geöffnet wird
  useEffect(() => {
    if (!task?.id) return;
    setCommentsLoading(true);
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => r.json())
      .then((data: TaskComment[]) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [task?.id]);

  const handleAddComment = async () => {
    if (!task?.id || !newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          authorName: commentAuthor.trim() || "Amadeus",
        }),
      });
      if (res.ok) {
        const created: TaskComment = await res.json();
        setComments((prev) => [...prev, created]);
        setNewComment("");
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch {
      // silently ignore
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task?.id) return;
    if (!confirm("Kommentar löschen?")) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      // silently ignore
    }
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true, locale: de });

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
      // Load existing task labels
      if (task.taskLabels) {
        setSelectedLabelIds(new Set(task.taskLabels.map((tl) => tl.label.id)));
      } else {
        setSelectedLabelIds(new Set());
      }
    } else {
      setSelectedLabelIds(new Set());
    }
  }, [task]);

  const handleToggleLabel = async (labelId: string) => {
    const newSet = new Set(selectedLabelIds);
    if (newSet.has(labelId)) {
      newSet.delete(labelId);
      // If editing existing task, remove via API
      if (task?.id) {
        await fetch(`/api/tasks/${task.id}/labels/${labelId}`, { method: "DELETE" }).catch(() => {});
      }
    } else {
      newSet.add(labelId);
      // If editing existing task, add via API
      if (task?.id) {
        await fetch(`/api/tasks/${task.id}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId }),
        }).catch(() => {});
      }
    }
    setSelectedLabelIds(newSet);
  };

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
        // Pass selected label IDs for new tasks (handled by caller)
        _labelIds: Array.from(selectedLabelIds),
      } as Partial<Task> & { _labelIds: string[] });
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

          {/* Labels */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
              <Tag className="w-3 h-3" /> Labels
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLabelDropdownOpen((v) => !v)}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-emerald-500/50 flex items-center gap-2 flex-wrap min-h-[38px]"
              >
                {selectedLabelIds.size === 0 ? (
                  <span className="text-zinc-600">Labels auswählen...</span>
                ) : (
                  availableLabels
                    .filter((l) => selectedLabelIds.has(l.id))
                    .map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${label.color}25`,
                          color: label.color,
                          border: `1px solid ${label.color}40`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </span>
                    ))
                )}
              </button>
              {labelDropdownOpen && (
                <div className="absolute z-20 top-full left-0 mt-1 w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden">
                  {availableLabels.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-zinc-500">Keine Labels vorhanden</div>
                  ) : (
                    availableLabels.map((label) => {
                      const selected = selectedLabelIds.has(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => handleToggleLabel(label.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#252525] text-left transition-colors"
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm text-white flex-1">{label.name}</span>
                          {selected && (
                            <span className="text-emerald-400 text-xs">✓</span>
                          )}
                        </button>
                      );
                    })
                  )}
                  <button
                    type="button"
                    onClick={() => setLabelDropdownOpen(false)}
                    className="w-full px-3 py-2 text-xs text-zinc-500 hover:bg-[#252525] text-right border-t border-[#2a2a2a]"
                  >
                    Schließen
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DueDate */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fällig am</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
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

          {/* Kommentar-Sektion (nur bei bestehendem Task) */}
          {task && (
            <div className="border-t border-[#2a2a2a] pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Diskussion ({comments.length})
                </h4>
              </div>

              {/* Kommentar-Liste */}
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {commentsLoading ? (
                  <p className="text-xs text-zinc-600 italic">Lädt...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">Noch keine Kommentare. Sei der Erste!</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-xs font-medium text-zinc-300">
                            {comment.authorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-600">
                            {timeAgo(comment.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                            title="Kommentar löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Neuer Kommentar */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Dein Name"
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Kommentar hinzufügen... (Strg+Enter zum Senden)"
                    rows={2}
                    className="flex-1 bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium self-end"
                  >
                    <Send className="w-3 h-3" />
                    {submittingComment ? "..." : "Senden"}
                  </button>
                </div>
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
