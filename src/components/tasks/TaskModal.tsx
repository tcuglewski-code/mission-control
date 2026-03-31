"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, MessageSquare, Send, Tag, GitBranch, Link2, AlertTriangle, RefreshCw, Sparkles, ShieldAlert, ShieldCheck, Network, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { Task, Project, User, Sprint, Label, Milestone } from "@/store/useAppStore";
import { TaskTimer } from "./TaskTimer";
import { SimilarTasks } from "./SimilarTasks";
import { LabelSuggestions } from "./LabelSuggestions";
import { MarkdownPreview } from "./MarkdownPreview";

interface CommentReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
}

interface TaskComment {
  id: string;
  content: string;
  authorName: string;
  authorEmail?: string | null;
  createdAt: string;
  reactions?: CommentReaction[];
}

const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🚀"];

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
  const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

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
    milestoneId: "",
    storyPoints: null as number | null,
    recurring: false,
    recurringInterval: "WEEKLY" as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
    recurringDay: "" as string,
    recurringEndDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [descMode, setDescMode] = useState<"edit" | "preview">("edit");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);

  // KI-Beschreibung State
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Abhängigkeits-State
  interface DepTask { id: string; title: string; status: string; dueDate?: string | null; isBlocker?: boolean; project?: { name: string; color: string } | null; }
  const [allTasks, setAllTasks] = useState<DepTask[]>([]);
  const [dependsOnIds, setDependsOnIds] = useState<string[]>([]);
  const [dependsOnBlockerMap, setDependsOnBlockerMap] = useState<Map<string, boolean>>(new Map()); // taskId → isBlocker
  const [blockingTasks, setBlockingTasks] = useState<DepTask[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [depDropdownOpen, setDepDropdownOpen] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const [depError, setDepError] = useState<string | null>(null);
  const [depLoading, setDepLoading] = useState(false);
  // "Abhängigkeiten" Tab
  const [activeTab, setActiveTab] = useState<"felder" | "abhaengigkeiten">("felder");
  const [startAfterTaskId, setStartAfterTaskId] = useState<string>("");
  const [startAfterTask, setStartAfterTask] = useState<DepTask | null>(null);
  const [blockerSaveError, setBlockerSaveError] = useState<string | null>(null);

  // Kommentar-State
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Amadeus");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // @Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);

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

    // Load milestones
    fetch("/api/milestones")
      .then((r) => r.json())
      .then((data: Milestone[]) => {
        if (Array.isArray(data)) setMilestones(data);
      })
      .catch(() => {});

    // Load all tasks for dependency dropdown + ähnliche Tasks
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllTasks(data);
      })
      .catch(() => {});

    // KI-Verfügbarkeit prüfen (einfacher Probe-Fetch)
    fetch("/api/ai/task-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "__ai_check__" }),
    })
      .then((r) => r.json())
      .then((data) => {
        // Wenn aiAvailable explizit false → Key fehlt
        setAiAvailable(data.aiAvailable !== false);
      })
      .catch(() => setAiAvailable(false));
  }, []);

  // KI-Beschreibung vorschlagen
  const handleAiDescription = async () => {
    if (!form.title.trim() || aiDescLoading) return;
    setAiDescLoading(true);
    try {
      const res = await fetch("/api/ai/task-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          projectId: form.projectId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setForm((prev) => ({ ...prev, description: data.description }));
      }
    } catch {
      // silently ignore
    } finally {
      setAiDescLoading(false);
    }
  };

  // Lade bestehende Abhängigkeiten wenn Task geöffnet
  useEffect(() => {
    if (!task?.id) {
      setDependsOnIds([]);
      setDependsOnBlockerMap(new Map());
      setBlockingTasks([]);
      setIsBlocked(false);
      return;
    }
    setDepLoading(true);
    fetch(`/api/tasks/dependencies?taskId=${task.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dependsOn && Array.isArray(data.dependsOn)) {
          setDependsOnIds(data.dependsOn.map((t: { id: string }) => t.id));
          const blockerMap = new Map<string, boolean>();
          data.dependsOn.forEach((t: { id: string; isBlocker?: boolean }) => {
            blockerMap.set(t.id, t.isBlocker ?? false);
          });
          setDependsOnBlockerMap(blockerMap);
        }
        if (data.blocking && Array.isArray(data.blocking)) {
          setBlockingTasks(data.blocking);
        }
        setIsBlocked(data.isBlocked ?? false);
      })
      .catch(() => {})
      .finally(() => setDepLoading(false));
  }, [task?.id]);

  // startAfterTaskId aus Task laden
  useEffect(() => {
    if (task?.startAfterTaskId) {
      setStartAfterTaskId(task.startAfterTaskId);
      const found = allTasks.find((t) => t.id === task.startAfterTaskId);
      if (found) setStartAfterTask(found);
    } else {
      setStartAfterTaskId("");
      setStartAfterTask(null);
    }
  }, [task, allTasks]);

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

  // @Mention: Kommentar-Eingabe überwachen
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    // Prüfe ob gerade ein @mention getippt wird
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@([\w\-äöüÄÖÜß]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionDropdownOpen(true);
    } else {
      setMentionQuery(null);
      setMentionDropdownOpen(false);
    }
  };

  // @Mention: User auswählen → in Text einfügen
  const insertMention = useCallback((username: string) => {
    const textarea = commentTextareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? newComment.length;
    const textBeforeCursor = newComment.slice(0, cursor);
    const textAfterCursor = newComment.slice(cursor);

    // Letztes @... im Text vor Cursor ersetzen
    const replaced = textBeforeCursor.replace(/@([\w\-äöüÄÖÜß]*)$/, `@${username} `);
    setNewComment(replaced + textAfterCursor);
    setMentionDropdownOpen(false);
    setMentionQuery(null);

    // Fokus & Cursor ans Ende setzen
    setTimeout(() => {
      textarea.focus();
      const pos = replaced.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  }, [newComment]);

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

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) => {
            if (c.id !== commentId) return c;
            const reactions = c.reactions ?? [];
            if (data.removed) {
              // Reaktion wurde entfernt
              return {
                ...c,
                reactions: reactions.filter(
                  (r) => !(r.emoji === emoji)
                ),
              };
            } else {
              // Reaktion wurde hinzugefügt
              return {
                ...c,
                reactions: [...reactions, data],
              };
            }
          })
        );
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
        milestoneId: task.milestoneId ?? "",
        storyPoints: task.storyPoints ?? null,
        recurring: task.recurring ?? false,
        recurringInterval: (task.recurringInterval as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") ?? "WEEKLY",
        recurringDay: task.recurringDay?.toString() ?? "",
        recurringEndDate: task.recurringEndDate ? format(new Date(task.recurringEndDate), "yyyy-MM-dd") : "",
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

    // UI-Validation: Blockierter Task kann nicht auf "Erledigt" gesetzt werden
    if (form.status === "done" && isBlocked) {
      const activeBlockers = allTasks.filter(
        (t) => dependsOnIds.includes(t.id) && dependsOnBlockerMap.get(t.id) && t.status !== "done"
      );
      const names = activeBlockers.map((t) => `„${t.title}"`).join(", ");
      setBlockerSaveError(`Dieser Task ist noch blockiert durch: ${names}. Bitte löse zuerst die Blocker.`);
      return;
    }
    setBlockerSaveError(null);

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
        milestoneId: form.milestoneId || null,
        storyPoints: form.storyPoints ?? null,
        recurring: form.recurring,
        recurringInterval: form.recurring ? form.recurringInterval : null,
        recurringDay: form.recurring && form.recurringDay ? parseInt(form.recurringDay) : null,
        recurringEndDate: form.recurring && form.recurringEndDate ? new Date(form.recurringEndDate) : null,
        startAfterTaskId: startAfterTaskId || null,
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

  // ─── Abhängigkeits-Handler ────────────────────────────────────────────────

  const handleAddDependency = async (dependsOnId: string, asBlocker = false) => {
    if (!task?.id) return;
    setDepError(null);
    try {
      const res = await fetch("/api/tasks/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, dependsOnId, isBlocker: asBlocker }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error ?? "Fehler beim Hinzufügen der Abhängigkeit");
        return;
      }
      setDependsOnIds((prev) => [...prev, dependsOnId]);
      setDependsOnBlockerMap((prev) => new Map(prev).set(dependsOnId, asBlocker));
      if (asBlocker) setIsBlocked(true);
    } catch {
      setDepError("Netzwerkfehler");
    }
  };

  const handleToggleBlocker = async (dependsOnId: string) => {
    if (!task?.id) return;
    const currentIsBlocker = dependsOnBlockerMap.get(dependsOnId) ?? false;
    const newIsBlocker = !currentIsBlocker;
    try {
      await fetch("/api/tasks/dependencies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, dependsOnId, isBlocker: newIsBlocker }),
      });
      setDependsOnBlockerMap((prev) => new Map(prev).set(dependsOnId, newIsBlocker));
      // Recompute isBlocked
      const updatedMap = new Map(dependsOnBlockerMap).set(dependsOnId, newIsBlocker);
      const depTasks = allTasks.filter((t) => dependsOnIds.includes(t.id));
      const hasActiveBlocker = depTasks.some(
        (t) => updatedMap.get(t.id) && t.status !== "done"
      );
      setIsBlocked(hasActiveBlocker);
    } catch {
      setDepError("Fehler beim Aktualisieren");
    }
  };

  const handleRemoveDependency = async (dependsOnId: string) => {
    if (!task?.id) return;
    setDepError(null);
    try {
      await fetch("/api/tasks/dependencies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, dependsOnId }),
      });
      const newIds = dependsOnIds.filter((id) => id !== dependsOnId);
      setDependsOnIds(newIds);
      const newMap = new Map(dependsOnBlockerMap);
      newMap.delete(dependsOnId);
      setDependsOnBlockerMap(newMap);
      // Recompute isBlocked
      const depTasks = allTasks.filter((t) => newIds.includes(t.id));
      const hasActiveBlocker = depTasks.some(
        (t) => newMap.get(t.id) && t.status !== "done"
      );
      setIsBlocked(hasActiveBlocker);
    } catch {
      setDepError("Fehler beim Entfernen");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] sm:rounded-xl w-full sm:max-w-lg shadow-2xl sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-2xl animate-slide-up sm:animate-none
        h-[95dvh] sm:h-auto max-h-[95dvh] sm:max-h-[90vh]">
        {/* Mobile Drag-Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#1c1c1c] z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">
              {task ? "Task bearbeiten" : "Neuer Task"}
            </h2>
            {isBlocked && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                <ShieldAlert className="w-3 h-3" /> Blockiert
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[#252525] bg-[#252525] sm:bg-transparent transition-colors border border-[#3a3a3a] sm:border-transparent"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab-Navigation (nur bei bestehendem Task) */}
        {task && (
          <div className="flex border-b border-[#2a2a2a] sticky top-[57px] bg-[#1c1c1c] z-10">
            <button
              type="button"
              onClick={() => setActiveTab("felder")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "felder"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Felder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("abhaengigkeiten")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "abhaengigkeiten"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Abhängigkeiten
              {(dependsOnIds.length > 0 || blockingTasks.length > 0) && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-700 text-zinc-300">
                  {dependsOnIds.length + blockingTasks.length}
                </span>
              )}
              {isBlocked && <span className="ml-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* ═══ TAB: ABHÄNGIGKEITEN (nur bei bestehendem Task) ═══════════════ */}
          {task && activeTab === "abhaengigkeiten" && (
            <div className="space-y-5">
              {/* Blocker-Status Banner */}
              {isBlocked ? (
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/25 rounded-xl">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Dieser Task ist blockiert</p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Er kann nicht auf &quot;Erledigt&quot; gesetzt werden bis alle Blocker abgeschlossen sind.
                    </p>
                  </div>
                </div>
              ) : (dependsOnIds.length > 0 || blockingTasks.length > 0) ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400">Keine aktiven Blocker</p>
                </div>
              ) : null}

              {depError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {depError}
                </div>
              )}

              {/* ─── Vorgänger (Abhängig von) ─────────────────────────────── */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                  Vorgänger
                  <span className="text-[10px] text-zinc-600 font-normal normal-case tracking-normal">
                    (muss abgeschlossen sein bevor dieser Task starten kann)
                  </span>
                </h4>

                {dependsOnIds.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic pl-2">Keine Vorgänger</p>
                ) : (
                  <div className="space-y-2">
                    {dependsOnIds.map((depId) => {
                      const depTask = allTasks.find((t) => t.id === depId);
                      const depIsBlocker = dependsOnBlockerMap.get(depId) ?? false;
                      const isDelayed = depTask?.dueDate && new Date(depTask.dueDate) < new Date() && depTask.status !== "done";
                      return (
                        <div
                          key={depId}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                            depIsBlocker
                              ? "bg-red-950/20 border-red-500/25"
                              : "bg-[#252525] border-[#3a3a3a]"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            depTask?.status === "done" ? "bg-emerald-500" :
                            depTask?.status === "in_progress" ? "bg-blue-500" : "bg-zinc-500"
                          }`} />
                          {depTask?.project && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: depTask.project.color }} />
                          )}
                          <span className="text-xs text-zinc-200 flex-1 truncate">
                            {depTask?.title ?? depId}
                          </span>
                          {depTask?.status === "done" && (
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">✓ Erledigt</span>
                          )}
                          {isDelayed && (
                            <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Verzögert
                            </span>
                          )}
                          {/* Blocker-Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlocker(depId)}
                            title={depIsBlocker ? "Als Blocker entfernen" : "Als Blocker markieren"}
                            className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                              depIsBlocker
                                ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                : "bg-[#1c1c1c] border-[#3a3a3a] text-zinc-600 hover:text-red-400 hover:border-red-500/30"
                            }`}
                          >
                            <ShieldAlert className="w-2.5 h-2.5" />
                            {depIsBlocker ? "Blocker" : "Blocker?"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(depId)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Verzögerungswarnung */}
                {dependsOnIds.some((depId) => {
                  const depTask = allTasks.find((t) => t.id === depId);
                  return depTask?.dueDate && new Date(depTask.dueDate) < new Date() && depTask.status !== "done";
                }) && task?.dueDate && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Ein oder mehrere Vorgänger sind verzögert. Der Starttermin dieses Tasks könnte sich verschieben.
                    </span>
                  </div>
                )}

                {/* Abhängigkeit hinzufügen */}
                <div className="relative mt-3">
                  <button
                    type="button"
                    onClick={() => setDepDropdownOpen((v) => !v)}
                    className="w-full text-left text-xs bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-zinc-500 hover:border-emerald-500/40 transition-colors flex items-center gap-1.5"
                  >
                    <Link2 className="w-3 h-3" />
                    Vorgänger hinzufügen...
                  </button>
                  {depDropdownOpen && (
                    <div className="absolute z-30 top-full left-0 mt-1 w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-[#2a2a2a]">
                        <input
                          type="text"
                          value={depSearch}
                          onChange={(e) => setDepSearch(e.target.value)}
                          placeholder="Task suchen..."
                          className="w-full bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {allTasks
                          .filter(
                            (t) =>
                              t.id !== task.id &&
                              !dependsOnIds.includes(t.id) &&
                              t.title.toLowerCase().includes(depSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                handleAddDependency(t.id, false);
                                setDepDropdownOpen(false);
                                setDepSearch("");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-[#252525] text-left transition-colors"
                            >
                              {t.project && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.project.color }} />
                              )}
                              <span className="flex-1 truncate">{t.title}</span>
                              <span className="text-zinc-600 shrink-0">{t.project?.name}</span>
                            </button>
                          ))}
                        {allTasks.filter(
                          (t) =>
                            t.id !== task.id &&
                            !dependsOnIds.includes(t.id) &&
                            t.title.toLowerCase().includes(depSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-xs text-zinc-500">Keine Tasks gefunden</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setDepDropdownOpen(false); setDepSearch(""); }}
                        className="w-full px-3 py-1.5 text-xs text-zinc-500 hover:bg-[#252525] border-t border-[#2a2a2a] text-right"
                      >
                        Schließen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Nachfolger (blockiert durch diesen Task) ─────────────── */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  Nachfolger
                  <span className="text-[10px] text-zinc-600 font-normal normal-case tracking-normal">
                    (warten auf Abschluss dieses Tasks)
                  </span>
                </h4>

                {blockingTasks.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic pl-2">Keine Nachfolger</p>
                ) : (
                  <div className="space-y-2">
                    {blockingTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                          t.isBlocker
                            ? "bg-amber-950/20 border-amber-500/25"
                            : "bg-[#252525] border-[#3a3a3a]"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          t.status === "done" ? "bg-emerald-500" :
                          t.status === "in_progress" ? "bg-blue-500" : "bg-zinc-500"
                        }`} />
                        {t.project && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.project.color }} />
                        )}
                        <span className="text-xs text-zinc-200 flex-1 truncate">{t.title}</span>
                        <span className="text-[9px] text-zinc-600">{t.project?.name}</span>
                        {t.isBlocker && (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" /> Blockiert
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Kritischer Pfad Hinweis ──────────────────────────────── */}
              {dependsOnIds.some((depId) => dependsOnBlockerMap.get(depId)) && (
                <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-zinc-300">Kritischer Pfad</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {dependsOnIds
                      .filter((depId) => dependsOnBlockerMap.get(depId))
                      .map((depId) => {
                        const depTask = allTasks.find((t) => t.id === depId);
                        return (
                          <span key={depId} className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                            {depTask?.title ?? depId}
                          </span>
                        );
                      })}
                    <span className="text-zinc-600 text-[10px]">→</span>
                    <span className="text-[10px] text-zinc-300 bg-[#252525] border border-[#3a3a3a] px-2 py-0.5 rounded-full">
                      {task.title}
                    </span>
                    {blockingTasks.filter((t) => t.isBlocker).map((t) => (
                      <>
                        <span key={`arrow-${t.id}`} className="text-zinc-600 text-[10px]">→</span>
                        <span key={t.id} className="text-[10px] text-zinc-300 bg-[#252525] border border-[#3a3a3a] px-2 py-0.5 rounded-full">
                          {t.title}
                        </span>
                      </>
                    ))}
                  </div>
                </div>
              )}

              {/* Speichern-Button für Tab */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          )}

          {/* ═══ TAB: FELDER (Standard-Formular) ════════════════════════════ */}
          {(!task || activeTab === "felder") && (
            <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task-Titel..."
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400">Beschreibung</label>
                {/* Edit / Preview Toggle */}
                <div className="flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setDescMode("edit")}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      descMode === "edit" ? "bg-[#2a2a2a] text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescMode("preview")}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      descMode === "preview" ? "bg-[#2a2a2a] text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAiDescription}
                disabled={aiDescLoading || !form.title.trim() || aiAvailable === false}
                title={
                  aiAvailable === false
                    ? "KI nicht verfügbar — ANTHROPIC_API_KEY fehlt"
                    : "KI-Beschreibung basierend auf Titel vorschlagen"
                }
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-2.5 h-2.5" />
                {aiDescLoading ? "KI denkt..." : "KI vorschlagen"}
              </button>
            </div>
            {descMode === "edit" ? (
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details... (Markdown: **bold**, *italic*, `code`, ## Überschrift, - Liste)"
                rows={3}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            ) : (
              <div className="min-h-[80px] bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5">
                <MarkdownPreview content={form.description} />
              </div>
            )}
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
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
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Story Points */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Story Points</label>
            <div className="flex flex-wrap gap-1.5">
              {FIBONACCI.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setForm({ ...form, storyPoints: form.storyPoints === sp ? null : sp })}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                    form.storyPoints === sp
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#252525] border-[#3a3a3a] text-zinc-400 hover:border-emerald-500/40 hover:text-white"
                  }`}
                >
                  {sp}
                </button>
              ))}
              {form.storyPoints !== null && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, storyPoints: null })}
                  className="px-2 h-9 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Project + Sprint */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Projekt</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
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
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Kein Sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Meilenstein */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Meilenstein</label>
            <select
              value={form.milestoneId}
              onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Kein Meilenstein</option>
              {milestones
                .filter((m) => !form.projectId || m.projectId === form.projectId)
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Zugewiesen</label>
            <select
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
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
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-left focus:outline-none focus:border-emerald-500/50 flex items-center gap-2 flex-wrap min-h-[44px]"
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

          {/* Smarte Label-Vorschläge basierend auf Titel */}
          <LabelSuggestions
            title={form.title}
            availableLabels={availableLabels}
            selectedLabelIds={selectedLabelIds}
            onToggleLabel={handleToggleLabel}
          />

          {/* DueDate */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fällig am</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Startdatum</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* ─── Wiederkehrend ──────────────────────────────────────────────── */}
          <div className="border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                Wiederkehrend
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, recurring: !form.recurring })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.recurring ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    form.recurring ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Recurring options — nur wenn aktiv */}
            {form.recurring && (
              <div className="space-y-3 pt-1">
                {/* Intervall */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Intervall</label>
                  <select
                    value={form.recurringInterval}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recurringInterval: e.target.value as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
                        recurringDay: "",
                      })
                    }
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="DAILY">Täglich</option>
                    <option value="WEEKLY">Wöchentlich</option>
                    <option value="MONTHLY">Monatlich</option>
                    <option value="QUARTERLY">Quartalsweise</option>
                    <option value="YEARLY">Jährlich</option>
                  </select>
                </div>

                {/* Wochentag (nur bei WEEKLY) */}
                {form.recurringInterval === "WEEKLY" && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Wochentag</label>
                    <select
                      value={form.recurringDay}
                      onChange={(e) => setForm({ ...form, recurringDay: e.target.value })}
                      className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Gleicher Wochentag</option>
                      <option value="1">Montag</option>
                      <option value="2">Dienstag</option>
                      <option value="3">Mittwoch</option>
                      <option value="4">Donnerstag</option>
                      <option value="5">Freitag</option>
                      <option value="6">Samstag</option>
                      <option value="7">Sonntag</option>
                    </select>
                  </div>
                )}

                {/* Tag des Monats (bei MONTHLY oder QUARTERLY) */}
                {(form.recurringInterval === "MONTHLY" || form.recurringInterval === "QUARTERLY") && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Tag des Monats</label>
                    <select
                      value={form.recurringDay}
                      onChange={(e) => setForm({ ...form, recurringDay: e.target.value })}
                      className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Gleicher Tag</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d.toString()}>
                          {d}.
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Enddatum */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Enddatum (optional)
                  </label>
                  <input
                    type="date"
                    value={form.recurringEndDate}
                    onChange={(e) => setForm({ ...form, recurringEndDate: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Wenn leer, wiederholt sich der Task unbegrenzt.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ─── "Startet erst nach" (für neue Tasks) ─── */}
          {!task && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" /> Startet erst nach
              </label>
              <select
                value={startAfterTaskId}
                onChange={(e) => setStartAfterTaskId(e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">— Sofort starten —</option>
                {allTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.project ? `[${t.project.name}] ` : ""}{t.title}
                  </option>
                ))}
              </select>
              {startAfterTaskId && (
                <p className="text-[10px] text-zinc-600 mt-1">
                  Dieser Task wird erst nach Abschluss des Vorgängers gestartet.
                </p>
              )}
            </div>
          )}

          {/* ─── Abhängigkeits-Kurzübersicht (im Felder-Tab, wenn Tab aktiv) ─── */}
          {task && activeTab === "felder" && (dependsOnIds.length > 0 || blockingTasks.length > 0) && (
            <div className="border border-[#2a2a2a] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3" /> Abhängigkeiten
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("abhaengigkeiten")}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Details →
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dependsOnIds.map((depId) => {
                  const depTask = allTasks.find((t) => t.id === depId);
                  const depIsBlocker = dependsOnBlockerMap.get(depId) ?? false;
                  return (
                    <span
                      key={depId}
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${
                        depIsBlocker
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "bg-[#252525] border-[#3a3a3a] text-zinc-400"
                      }`}
                    >
                      {depIsBlocker && <ShieldAlert className="w-2.5 h-2.5" />}
                      {depTask?.title ?? depId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agent Prompt */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Agent-Prompt</label>
            <textarea
              value={form.agentPrompt}
              onChange={(e) => setForm({ ...form, agentPrompt: e.target.value })}
              placeholder="Anweisungen für den Agenten..."
              rows={3}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
            />
          </div>

          {/* Ähnliche Tasks (Fuzzy-Match auf Titel) */}
          {task && allTasks.length > 0 && (
            <SimilarTasks
              currentTaskId={task.id}
              currentTitle={form.title}
              allTasks={allTasks}
            />
          )}

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
                  comments.map((comment) => {
                    // Reaktionen gruppieren: emoji → [userId, ...]
                    const reactionGroups: Record<string, string[]> = {};
                    for (const r of comment.reactions ?? []) {
                      if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
                      reactionGroups[r.emoji].push(r.userId);
                    }

                    return (
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

                        {/* ─── Reaktionen ─────────────────────────────────────── */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {/* Bestehende Reaktionen */}
                          {Object.entries(reactionGroups).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(comment.id, emoji)}
                              title={`${userIds.length} Reaktion${userIds.length !== 1 ? "en" : ""}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#252525] border border-[#3a3a3a] hover:border-emerald-500/40 text-[11px] transition-colors"
                            >
                              <span>{emoji}</span>
                              <span className="text-zinc-400 font-medium">{userIds.length}</span>
                            </button>
                          ))}

                          {/* Emoji-Picker (6 feste Emojis) */}
                          <div className="relative group/picker">
                            <button
                              type="button"
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#252525] border border-[#3a3a3a] hover:border-emerald-500/40 text-zinc-500 hover:text-white transition-all text-[11px]"
                              title="Reaktion hinzufügen"
                            >
                              +
                            </button>
                            {/* Hover-Dropdown */}
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/picker:flex items-center gap-0.5 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg px-1.5 py-1 shadow-xl z-30">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(comment.id, emoji)}
                                  className="text-base hover:scale-125 transition-transform px-0.5"
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                <div className="flex gap-2 relative">
                  {/* @Mention Dropdown */}
                  {mentionDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-[#3a3a3a]">
                        Benutzer erwähnen
                      </div>
                      {users
                        .filter((u) =>
                          !mentionQuery ||
                          u.name.toLowerCase().includes(mentionQuery.toLowerCase())
                        )
                        .slice(0, 6)
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(u.name.replace(/\s+/g, ""));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#333] transition-colors text-left"
                          >
                            {u.avatar ? (
                              <img src={u.avatar} className="w-5 h-5 rounded-full" alt="" />
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                                {u.name.charAt(0)}
                              </span>
                            )}
                            <span>{u.name}</span>
                          </button>
                        ))}
                      {users.filter((u) =>
                        !mentionQuery ||
                        u.name.toLowerCase().includes(mentionQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-xs text-zinc-500">
                          Kein Benutzer gefunden
                        </div>
                      )}
                    </div>
                  )}
                  <textarea
                    ref={commentTextareaRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setMentionDropdownOpen(false);
                      }
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Kommentar hinzufügen... @Name für Erwähnung"
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

          {/* Blocker-Fehler */}
          {blockerSaveError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-300">Task ist blockiert</p>
                <p className="text-xs text-red-400/80 mt-0.5">{blockerSaveError}</p>
              </div>
            </div>
          )}

            </div>
          )}
          {/* END felder tab */}

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
