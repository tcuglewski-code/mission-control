"use client";

import { useState, useEffect } from "react";
import { Plus, Flag, RefreshCw } from "lucide-react";
import { MilestoneCard, type Milestone } from "./MilestoneCard";
import { MilestoneForm } from "./MilestoneForm";

interface MilestoneListProps {
  projectId: string;
  initialMilestones?: Milestone[];
}

export function MilestoneList({ projectId, initialMilestones = [] }: MilestoneListProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [loading, setLoading] = useState(initialMilestones.length === 0);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const fetchMilestones = async () => {
    try {
      const res = await fetch(`/api/milestones?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Meilensteine:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMilestones.length === 0) {
      fetchMilestones();
    }
  }, [projectId]);

  const handleCreate = async (data: Partial<Milestone>) => {
    const res = await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId }),
    });
    if (res.ok) {
      await fetchMilestones();
    }
  };

  const handleUpdate = async (data: Partial<Milestone>) => {
    if (!editingMilestone) return;
    const res = await fetch(`/api/milestones/${editingMilestone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchMilestones();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Meilenstein wirklich löschen? Tasks werden nicht gelöscht, nur die Verknüpfung entfernt.")) return;
    const res = await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMilestone(null);
  };

  const activeMilestones = milestones.filter((m) => m.status === "active" || m.status === "planned");
  const completedMilestones = milestones.filter((m) => m.status === "completed" || m.status === "cancelled");

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Meilensteine</h2>
          <span className="text-xs text-zinc-600">({milestones.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMilestones()}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 mt-2">Lade Meilensteine...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-8">
          <Flag className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Noch keine Meilensteine</p>
          <p className="text-xs text-zinc-600 mt-1">Erstelle deinen ersten Meilenstein</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeMilestones.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Aktiv & Geplant</h3>
              <div className="grid gap-3">
                {activeMilestones.map((m) => (
                  <MilestoneCard
                    key={m.id}
                    milestone={m}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {completedMilestones.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Abgeschlossen</h3>
              <div className="grid gap-2">
                {completedMilestones.map((m) => (
                  <MilestoneCard
                    key={m.id}
                    milestone={m}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <MilestoneForm
          milestone={editingMilestone}
          projectId={projectId}
          onClose={handleCloseForm}
          onSave={editingMilestone ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}
