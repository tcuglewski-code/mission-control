"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Eye, Edit3, Zap } from "lucide-react";
import { format } from "date-fns";
import type { Task, User, Label } from "@/store/useAppStore";
import { MarkdownPreview } from "./MarkdownPreview";
import { useAppStore } from "@/store/useAppStore";

interface TaskQuickEditPanelProps {
  task: Task;
  users: User[];
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "in_review", label: "In Prüfung" },
  { value: "done", label: "Erledigt" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "🟢 Niedrig" },
  { value: "medium", label: "🟡 Mittel" },
  { value: "high", label: "🔴 Hoch" },
  { value: "critical", label: "🔴 Kritisch" },
];

export function TaskQuickEditPanel({ task, users, onClose, onUpdate }: TaskQuickEditPanelProps) {
  const { tasks, setTasks } = useAppStore();
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
  });
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(task.taskLabels?.map((tl) => tl.label.id) ?? [])
  );
  const [descMode, setDescMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Labels laden
  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((data: Label[]) => { if (Array.isArray(data)) setAvailableLabels(data); })
      .catch(() => {});
  }, []);

  // Escape schließt Panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Klick außerhalb schließt Panel
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Leicht verzögert damit initialer Klick (auf "Bearbeiten"-Button) nicht sofort schließt
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  // Debounced Auto-Save bei Formularänderungen
  const scheduleAutoSave = useCallback((updatedForm: typeof form) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const payload: Partial<Task> = {
          title: updatedForm.title.trim() || task.title,
          description: updatedForm.description || null,
          status: updatedForm.status,
          priority: updatedForm.priority,
          assigneeId: updatedForm.assigneeId || null,
          dueDate: updatedForm.dueDate ? new Date(updatedForm.dueDate) : null,
        };
        await onUpdate(task.id, payload);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 1500);
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [task.id, task.title, onUpdate]);

  const handleChange = (field: keyof typeof form, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    scheduleAutoSave(updated);
  };

  const handleToggleLabel = async (labelId: string) => {
    const newSet = new Set(selectedLabelIds);
    if (newSet.has(labelId)) {
      newSet.delete(labelId);
      await fetch(`/api/tasks/${task.id}/labels/${labelId}`, { method: "DELETE" }).catch(() => {});
    } else {
      newSet.add(labelId);
      await fetch(`/api/tasks/${task.id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      }).catch(() => {});
    }
    setSelectedLabelIds(newSet);
    // Task-Labels im Store optimistisch aktualisieren
    const updatedTasks = tasks.map((t) => {
      if (t.id !== task.id) return t;
      const labelObj = availableLabels.find((l) => l.id === labelId);
      if (!labelObj) return t;
      const currentLabels = t.taskLabels ?? [];
      const newLabels = newSet.has(labelId)
        ? [...currentLabels, { label: labelObj }]
        : currentLabels.filter((tl) => tl.label.id !== labelId);
      return { ...t, taskLabels: newLabels };
    });
    setTasks(updatedTasks);
  };

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-full w-80 bg-[#161616] border-l border-[#2a2a2a] z-40 flex flex-col shadow-2xl animate-slide-in-right"
      style={{ animation: "slideInRight 0.2s ease-out" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-semibold text-white">Quick-Edit</span>
          {saving && <span className="text-[10px] text-zinc-500">Speichert...</span>}
          {savedIndicator && !saving && (
            <span className="text-[10px] text-emerald-400">✓ Gespeichert</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Formular — scrollbar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Titel */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Titel</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Priorität */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Priorität</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRIORITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleChange("priority", o.value)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  form.priority === o.value
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#252525] border-[#3a3a3a] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zugewiesen */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Zugewiesen</label>
          <select
            value={form.assigneeId}
            onChange={(e) => handleChange("assigneeId", e.target.value)}
            className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Niemand</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Fälligkeit */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Fällig am</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
            className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Labels */}
        {availableLabels.length > 0 && (
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {availableLabels.map((label) => {
                const selected = selectedLabelIds.has(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleToggleLabel(label.id)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all border"
                    style={{
                      backgroundColor: selected ? `${label.color}30` : "transparent",
                      color: selected ? label.color : "#71717a",
                      borderColor: selected ? `${label.color}50` : "#3a3a3a",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: selected ? label.color : "#52525b" }}
                    />
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Beschreibung mit Edit/Preview Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Beschreibung</label>
            <div className="flex items-center bg-[#252525] border border-[#3a3a3a] rounded p-0.5">
              <button
                type="button"
                onClick={() => setDescMode("edit")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                  descMode === "edit" ? "bg-[#3a3a3a] text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Edit3 className="w-2.5 h-2.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setDescMode("preview")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                  descMode === "preview" ? "bg-[#3a3a3a] text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Eye className="w-2.5 h-2.5" /> Preview
              </button>
            </div>
          </div>

          {descMode === "edit" ? (
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Beschreibung (Markdown unterstützt)..."
              rows={6}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
            />
          ) : (
            <div className="min-h-[100px] bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2">
              <MarkdownPreview content={form.description} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2a2a2a] shrink-0">
        <p className="text-[10px] text-zinc-600 text-center">
          Änderungen werden automatisch gespeichert · Escape zum Schließen
        </p>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
