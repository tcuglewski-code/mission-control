"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { Milestone } from "./MilestoneCard";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface MilestoneFormProps {
  milestone?: Milestone | null;
  projectId?: string;
  projects?: Project[];
  onClose: () => void;
  onSave: (data: Partial<Milestone>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Geplant" },
  { value: "active", label: "Aktiv" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "cancelled", label: "Abgebrochen" },
];

const COLOR_OPTIONS = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export function MilestoneForm({ milestone, projectId, projects = [], onClose, onSave }: MilestoneFormProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "planned",
    color: "#8b5cf6",
    dueDate: "",
    projectId: projectId ?? "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (milestone) {
      setForm({
        title: milestone.title,
        description: milestone.description ?? "",
        status: milestone.status,
        color: milestone.color,
        dueDate: milestone.dueDate ? format(new Date(milestone.dueDate), "yyyy-MM-dd") : "",
        projectId: milestone.projectId,
      });
    } else if (projectId) {
      setForm((f) => ({ ...f, projectId }));
    }
  }, [milestone, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.projectId) return;
    setLoading(true);
    try {
      await onSave({
        ...form,
        dueDate: form.dueDate || null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] sm:rounded-xl w-full sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white">
            {milestone ? "Meilenstein bearbeiten" : "Neuer Meilenstein"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-[#252525]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Meilenstein-Titel..."
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Was soll erreicht werden..."
              rows={3}
              className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {!projectId && projects.length > 0 && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Projekt *</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
                required
              >
                <option value="">Projekt auswählen...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fällig am</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-base text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-7 h-7 rounded-lg transition-all ${
                    form.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1c]" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !form.title.trim() || !form.projectId}
              className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
            >
              {loading ? "Speichern..." : milestone ? "Aktualisieren" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
