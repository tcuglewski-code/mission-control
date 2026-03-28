"use client";

import { useState, useEffect } from "react";
import { X, Users, Flag, Tag, Calendar, Check, ChevronDown } from "lucide-react";
import type { Task, User, Label } from "@/store/useAppStore";

interface BulkEditBarProps {
  selectedIds: Set<string>;
  tasks: Task[];
  users: User[];
  onClearSelection: () => void;
  onBulkUpdate: (ids: string[], data: Partial<Task>) => Promise<void>;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "🟢 Niedrig" },
  { value: "medium", label: "🟡 Mittel" },
  { value: "high", label: "🔴 Hoch" },
  { value: "critical", label: "🔴 Kritisch" },
];

export function BulkEditBar({ selectedIds, tasks, users, onClearSelection, onBulkUpdate }: BulkEditBarProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((data: Label[]) => { if (Array.isArray(data)) setAvailableLabels(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openDropdown) setOpenDropdown(null);
        else onClearSelection();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openDropdown, onClearSelection]);

  const count = selectedIds.size;

  const handleApply = async (data: Partial<Task>) => {
    if (saving) return;
    setSaving(true);
    try {
      await onBulkUpdate(Array.from(selectedIds), data);
      setSavedCount(count);
      setTimeout(() => setSavedCount(null), 2000);
      setOpenDropdown(null);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabel = async (labelId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((taskId) =>
          fetch(`/api/tasks/${taskId}/labels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ labelId }),
          }).catch(() => {})
        )
      );
      setSavedCount(count);
      setTimeout(() => setSavedCount(null), 2000);
      setOpenDropdown(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-[#1c1c1c] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-black/50 animate-slide-up">
      {/* Auswahl-Info */}
      <div className="flex items-center gap-2 pr-3 border-r border-[#3a3a3a]">
        <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Check className="w-3 h-3 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-white">{count} Task{count !== 1 ? "s" : ""} ausgewählt</span>
      </div>

      {savedCount !== null && (
        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> {savedCount} aktualisiert
        </span>
      )}

      {saving && <span className="text-[11px] text-zinc-500">Speichert...</span>}

      {/* Assignee */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-[#252525] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          Zuweisen
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        </button>
        {openDropdown === "assignee" && (
          <div className="absolute bottom-full left-0 mb-2 w-44 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => handleApply({ assigneeId: null })}
              className="w-full px-3 py-2 text-xs text-zinc-500 hover:bg-[#252525] text-left hover:text-white transition-colors"
            >
              Niemand
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleApply({ assigneeId: u.id })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#252525] text-left transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priorität */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-[#252525] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg transition-colors"
        >
          <Flag className="w-3.5 h-3.5 text-yellow-400" />
          Priorität
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        </button>
        {openDropdown === "priority" && (
          <div className="absolute bottom-full left-0 mb-2 w-40 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden">
            {PRIORITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleApply({ priority: o.value })}
                className="w-full px-3 py-2 text-xs text-white hover:bg-[#252525] text-left transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Label hinzufügen */}
      {availableLabels.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "labels" ? null : "labels")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-[#252525] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            Label
            <ChevronDown className="w-3 h-3 text-zinc-600" />
          </button>
          {openDropdown === "labels" && (
            <div className="absolute bottom-full left-0 mb-2 w-44 bg-[#1c1c1c] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {availableLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => handleAddLabel(label.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#252525] text-left transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="truncate">{label.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fälligkeit */}
      <div className="relative">
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-[#252525] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg transition-colors cursor-pointer">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          Fälligkeit
          <input
            type="date"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={(e) => {
              if (e.target.value) {
                handleApply({ dueDate: new Date(e.target.value) });
              }
            }}
          />
        </label>
      </div>

      {/* Schließen */}
      <button
        type="button"
        onClick={onClearSelection}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
        title="Auswahl aufheben (Escape)"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
