"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  Euro,
  Calendar,
  MoreHorizontal,
  Trash2,
  Edit2,
  TrendingUp,
  Target,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Pipeline Stages mit Farben
const STAGES = [
  { id: "prospect", label: "Prospect", color: "#6b7280", bgClass: "bg-gray-500/10 border-gray-500/30" },
  { id: "qualified", label: "Qualifiziert", color: "#3b82f6", bgClass: "bg-blue-500/10 border-blue-500/30" },
  { id: "demo", label: "Demo", color: "#8b5cf6", bgClass: "bg-violet-500/10 border-violet-500/30" },
  { id: "proposal", label: "Angebot", color: "#f59e0b", bgClass: "bg-amber-500/10 border-amber-500/30" },
  { id: "closed-won", label: "Gewonnen ✓", color: "#22c55e", bgClass: "bg-emerald-500/10 border-emerald-500/30" },
  { id: "closed-lost", label: "Verloren ✗", color: "#ef4444", bgClass: "bg-red-500/10 border-red-500/30" },
];

interface Deal {
  id: string;
  title: string;
  company: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  value: number;
  stage: string;
  probability: number;
  source?: string;
  notes?: string;
  industry?: string;
  employees?: number;
  nextAction?: string;
  nextActionDate?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

interface StageStats {
  stage: string;
  _count: { id: number };
  _sum: { value: number | null };
}

// Sortable Deal Card
function SortableDealCard({
  deal,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-[#3a3a3a] transition-all group",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-white truncate flex-1">{deal.title}</h4>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
            className="p-1 text-zinc-500 hover:text-blue-400"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }}
            className="p-1 text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
        <Building2 className="w-3 h-3" />
        <span className="truncate">{deal.company}</span>
      </div>

      {deal.contactName && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <User className="w-3 h-3" />
          <span className="truncate">{deal.contactName}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-emerald-400 font-medium text-sm">
          <Euro className="w-3.5 h-3.5" />
          {deal.value.toLocaleString("de-DE")}
        </div>
        <div
          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
          title={`Wahrscheinlichkeit: ${deal.probability}%`}
        >
          {deal.probability}%
        </div>
      </div>

      {deal.nextAction && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2a] text-[10px] text-zinc-500 truncate">
          → {deal.nextAction}
        </div>
      )}
    </div>
  );
}

// Pipeline Column
function PipelineColumn({
  stage,
  deals,
  stats,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
}: {
  stage: (typeof STAGES)[number];
  deals: Deal[];
  stats?: StageStats;
  onAddDeal: (stage: string) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
}) {
  const totalValue = stats?._sum?.value ?? 0;
  const count = stats?._count?.id ?? 0;

  return (
    <div className="flex-shrink-0 w-72 bg-[#161616] rounded-lg border border-[#2a2a2a] flex flex-col max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 border-b border-[#2a2a2a] rounded-t-lg",
          stage.bgClass
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-sm text-white">{stage.label}</h3>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
              {count}
            </span>
          </div>
          <button
            onClick={() => onAddDeal(stage.id)}
            className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {totalValue > 0 && (
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <Euro className="w-3 h-3" />
            {totalValue.toLocaleString("de-DE")}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-xs">
            Keine Deals
          </div>
        )}
      </div>
    </div>
  );
}

// Deal Modal
function DealModal({
  deal,
  stage,
  onClose,
  onSave,
}: {
  deal: Deal | null;
  stage: string;
  onClose: () => void;
  onSave: (data: Partial<Deal>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Deal>>({
    title: deal?.title ?? "",
    company: deal?.company ?? "",
    contactName: deal?.contactName ?? "",
    contactEmail: deal?.contactEmail ?? "",
    contactPhone: deal?.contactPhone ?? "",
    value: deal?.value ?? 0,
    stage: deal?.stage ?? stage,
    probability: deal?.probability ?? 10,
    source: deal?.source ?? "",
    notes: deal?.notes ?? "",
    industry: deal?.industry ?? "",
    employees: deal?.employees ?? undefined,
    nextAction: deal?.nextAction ?? "",
    nextActionDate: deal?.nextActionDate?.split("T")[0] ?? "",
    ownerName: deal?.ownerName ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">
            {deal ? "Deal bearbeiten" : "Neuer Deal"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Titel *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="z.B. ForstManager für Müller GmbH"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unternehmen *</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Branche</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              >
                <option value="">Auswählen...</option>
                <option value="Forstbetrieb">Forstbetrieb</option>
                <option value="Landschaftsbau">Landschaftsbau</option>
                <option value="Tiefbau">Tiefbau</option>
                <option value="Landwirtschaft">Landwirtschaft</option>
                <option value="Reinigung">Reinigung</option>
                <option value="Handwerk">Handwerk</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ansprechpartner</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">E-Mail</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Mitarbeiter</label>
              <input
                type="number"
                value={formData.employees ?? ""}
                onChange={(e) => setFormData({ ...formData, employees: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Anzahl"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Deal-Wert (€)</label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Wahrscheinlichkeit (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Quelle</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              >
                <option value="">Auswählen...</option>
                <option value="Website">Website</option>
                <option value="Empfehlung">Empfehlung</option>
                <option value="Kaltakquise">Kaltakquise</option>
                <option value="Messe">Messe</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Google">Google</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Verantwortlich</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="Name"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nächster Schritt</label>
              <input
                type="text"
                value={formData.nextAction}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                placeholder="z.B. Termin vereinbaren"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fällig am</label>
              <input
                type="date"
                value={formData.nextActionDate}
                onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Notizen</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
            >
              {deal ? "Speichern" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [modalStage, setModalStage] = useState("prospect");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const loadDeals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/deals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals);
        setStageStats(data.stageStats);
      }
    } catch (error) {
      console.error("Error loading deals:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleAddDeal = (stage: string) => {
    setEditingDeal(null);
    setModalStage(stage);
    setModalOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setModalStage(deal.stage);
    setModalOpen(true);
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm("Deal wirklich löschen?")) return;
    try {
      await fetch(`/api/deals/${id}`, { method: "DELETE" });
      loadDeals();
    } catch (error) {
      console.error("Error deleting deal:", error);
    }
  };

  const handleSaveDeal = async (data: Partial<Deal>) => {
    try {
      if (editingDeal) {
        await fetch(`/api/deals/${editingDeal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, stage: modalStage }),
        });
      }
      setModalOpen(false);
      loadDeals();
    } catch (error) {
      console.error("Error saving deal:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    // Finde neue Stage basierend auf over
    let newStage = deal.stage;

    // Prüfe ob über einer Stage-Column oder einem anderen Deal
    const overDeal = deals.find((d) => d.id === over.id);
    if (overDeal) {
      newStage = overDeal.stage;
    } else {
      // Prüfe ob over.id eine Stage ist
      const isStage = STAGES.some((s) => s.id === over.id);
      if (isStage) {
        newStage = over.id as string;
      }
    }

    if (newStage !== deal.stage) {
      // Update Stage
      try {
        await fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
        loadDeals();
      } catch (error) {
        console.error("Error updating deal stage:", error);
      }
    }
  };

  // Pipeline-Metriken
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
  const activeDeals = deals.filter((d) => !d.stage.startsWith("closed-")).length;
  const wonDeals = deals.filter((d) => d.stage === "closed-won");
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-zinc-500">Lade Pipeline...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-emerald-400" />
              Sales Pipeline
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Kunden-Akquise verwalten</p>
          </div>
          <button
            onClick={() => handleAddDeal("prospect")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Deal
          </button>
        </div>

        {/* Metriken */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Aktive Deals</p>
            <p className="text-2xl font-bold text-white">{activeDeals}</p>
          </div>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Pipeline-Wert</p>
            <p className="text-2xl font-bold text-emerald-400">
              €{totalValue.toLocaleString("de-DE")}
            </p>
          </div>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Gewichteter Wert</p>
            <p className="text-2xl font-bold text-amber-400">
              €{Math.round(weightedValue).toLocaleString("de-DE")}
            </p>
          </div>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Gewonnen (gesamt)</p>
            <p className="text-2xl font-bold text-blue-400">
              €{wonValue.toLocaleString("de-DE")}
            </p>
          </div>
        </div>

        {/* Suche */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.id);
            const stats = stageStats.find((s) => s.stage === stage.id);
            return (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                stats={stats}
                onAddDeal={handleAddDeal}
                onEditDeal={handleEditDeal}
                onDeleteDeal={handleDeleteDeal}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="bg-[#1a1a1a] border border-emerald-500/50 rounded-lg p-3 shadow-2xl w-72">
              <h4 className="text-sm font-medium text-white mb-1">{activeDeal.title}</h4>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Building2 className="w-3 h-3" />
                {activeDeal.company}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modal */}
      {modalOpen && (
        <DealModal
          deal={editingDeal}
          stage={modalStage}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveDeal}
        />
      )}
    </div>
  );
}
