"use client";

import { useEffect, useRef, useState } from "react";
import { X, Zap, Leaf } from "lucide-react";
import { useQuickAdd } from "@/hooks/useQuickAdd";

interface Project {
  id: string;
  name: string;
  color: string;
}

type Priority = "low" | "medium" | "high";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; activeBg: string }> = {
  low: {
    label: "Niedrig",
    color: "text-zinc-400",
    bg: "border-zinc-700 hover:border-zinc-500",
    activeBg: "bg-zinc-700 border-zinc-500 text-white",
  },
  medium: {
    label: "Mittel",
    color: "text-amber-400",
    bg: "border-zinc-700 hover:border-amber-600",
    activeBg: "bg-amber-900/40 border-amber-600 text-amber-300",
  },
  high: {
    label: "Hoch",
    color: "text-red-400",
    bg: "border-zinc-700 hover:border-red-600",
    activeBg: "bg-red-900/40 border-red-600 text-red-300",
  },
};

export function QuickAddTaskModal() {
  const { open, setOpen } = useQuickAdd();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Lade Projekte wenn Modal öffnet
  useEffect(() => {
    if (open) {
      setTitle("");
      setError("");
      setProjectId("");
      setPriority("medium");
      setTimeout(() => inputRef.current?.focus(), 50);

      fetch("/api/projects")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setProjects(list.filter((p: Project) => p && p.id));
          if (list.length > 0) setProjectId(list[0].id);
        })
        .catch(() => setProjects([]));
    }
  }, [open]);

  // Keyboard-Shortcut: Cmd+Shift+N
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Bitte gib einen Task-Titel ein.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          status: "todo",
          ...(projectId ? { projectId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fehler beim Erstellen des Tasks");
      }

      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg z-50 px-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2.5">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Neuer Task</span>
              <span className="text-[10px] text-zinc-600 bg-[#222] px-1.5 py-0.5 rounded font-mono">
                ⌘⇧N
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Titel-Input */}
            <div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Was soll erledigt werden?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-zinc-500 text-sm outline-none focus:border-emerald-600 transition-colors"
                autoComplete="off"
              />
            </div>

            {/* Projekt-Dropdown */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
                Projekt
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-600 transition-colors appearance-none cursor-pointer"
              >
                <option value="">— Kein Projekt —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority-Toggle */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
                Priorität
              </label>
              <div className="flex gap-2">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isActive = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                        isActive ? cfg.activeBg : `bg-transparent ${cfg.bg} text-zinc-400`
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fehler */}
            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-600">
                <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded text-zinc-500">↵ Enter</kbd>
                {" "}zum Speichern
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-[#252525] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {submitting ? "Erstelle..." : "Task erstellen"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
