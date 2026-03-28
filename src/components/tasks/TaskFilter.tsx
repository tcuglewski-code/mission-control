"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Tag,
  ArrowUp,
  ArrowDown,
  Bookmark,
} from "lucide-react";
import type { User, Label, Milestone, Project } from "@/store/useAppStore";

// ─── Typen ─────────────────────────────────────────────────────────────────

export interface FilterState {
  status: string;
  priority: string;
  assigneeId: string;
  labelId: string;
  milestoneId: string;
  dueDateFrom: string;
  dueDateTo: string;
}

export type SortField = "dueDate" | "priority" | "createdAt" | "updatedAt" | "title";
export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  sort: SortState;
}

export const EMPTY_FILTERS: FilterState = {
  status: "",
  priority: "",
  assigneeId: "",
  labelId: "",
  milestoneId: "",
  dueDateFrom: "",
  dueDateTo: "",
};

export const DEFAULT_SORT: SortState = { field: "createdAt", direction: "desc" };

const LOCALSTORAGE_KEY = "mc_saved_filters";

// ─── Label-Hilfsfunktionen ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  in_review: "In Review",
  done: "Erledigt",
  backlog: "Backlog",
  blocked: "Blockiert",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "🔴 Kritisch",
  high: "🔶 Hoch",
  medium: "🟡 Mittel",
  low: "🟢 Niedrig",
};

const SORT_FIELD_LABELS: Record<SortField, string> = {
  dueDate: "Fälligkeit",
  priority: "Priorität",
  createdAt: "Erstellt",
  updatedAt: "Zuletzt geändert",
  title: "Titel",
};

// ─── LocalStorage ───────────────────────────────────────────────────────────

function loadSavedFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(filters));
}

// ─── Aktive Filter zählen ───────────────────────────────────────────────────

export function countActiveFilters(f: FilterState): number {
  return Object.values(f).filter(Boolean).length;
}

// ─── Haupt-Komponente ───────────────────────────────────────────────────────

interface TaskFilterProps {
  filters: FilterState;
  sort: SortState;
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortState) => void;
  users: User[];
  labels: Label[];
  milestones: Milestone[];
  projects: Project[];
}

export function TaskFilter({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  users,
  labels,
  milestones,
  projects,
}: TaskFilterProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    setSavedFilters(loadSavedFilters());
  }, []);

  const activeCount = countActiveFilters(filters);

  // ── einzelnes Feld ändern ──
  const setField = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  // ── alle zurücksetzen ──
  const resetAll = () => onFiltersChange(EMPTY_FILTERS);

  // ── Sortierung toggeln ──
  const toggleSort = (field: SortField) => {
    if (sort.field === field) {
      onSortChange({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ field, direction: "desc" });
    }
  };

  // ── Filter speichern ──
  const handleSave = () => {
    if (!saveName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveName.trim(),
      filters,
      sort,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    saveSavedFilters(updated);
    setShowSaveDialog(false);
    setSaveName("");
  };

  // ── gespeicherten Filter laden ──
  const applyFilter = (sf: SavedFilter) => {
    onFiltersChange(sf.filters);
    onSortChange(sf.sort);
  };

  // ── gespeicherten Filter löschen ──
  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    saveSavedFilters(updated);
  };

  // ── Aktive-Filter-Badge-Label ──
  const getFilterBadges = (): { key: keyof FilterState; label: string }[] => {
    const badges: { key: keyof FilterState; label: string }[] = [];
    if (filters.status)
      badges.push({ key: "status", label: `Status: ${STATUS_LABELS[filters.status] ?? filters.status}` });
    if (filters.priority)
      badges.push({ key: "priority", label: `Priorität: ${PRIORITY_LABELS[filters.priority] ?? filters.priority}` });
    if (filters.assigneeId) {
      const u = users.find((u) => u.id === filters.assigneeId);
      badges.push({ key: "assigneeId", label: `Zugewiesen: ${u?.name ?? filters.assigneeId}` });
    }
    if (filters.labelId) {
      const l = labels.find((l) => l.id === filters.labelId);
      badges.push({ key: "labelId", label: `Label: ${l?.name ?? filters.labelId}` });
    }
    if (filters.milestoneId) {
      const m = milestones.find((m) => m.id === filters.milestoneId);
      badges.push({ key: "milestoneId", label: `Meilenstein: ${m?.title ?? filters.milestoneId}` });
    }
    if (filters.dueDateFrom)
      badges.push({ key: "dueDateFrom", label: `Ab: ${filters.dueDateFrom}` });
    if (filters.dueDateTo)
      badges.push({ key: "dueDateTo", label: `Bis: ${filters.dueDateTo}` });
    return badges;
  };

  const badges = getFilterBadges();

  return (
    <div className="space-y-3">
      {/* ── Gespeicherte Filter Quick-Chips ── */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
            <Bookmark className="w-3 h-3" /> Gespeichert:
          </span>
          {savedFilters.map((sf) => (
            <div key={sf.id} className="flex items-center gap-1 group">
              <button
                onClick={() => applyFilter(sf)}
                className="px-2.5 py-1 text-[10px] rounded-full border border-[#2a2a2a] bg-[#1c1c1c] text-zinc-400 hover:text-white hover:border-[#3a3a3a] transition-colors"
              >
                {sf.name}
              </button>
              <button
                onClick={() => deleteFilter(sf.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar: Filter-Toggle + Sortierung + Speichern ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter-Toggle */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            panelOpen || activeCount > 0
              ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
              : "bg-[#1c1c1c] border-[#2a2a2a] text-zinc-400 hover:text-zinc-200 hover:border-[#3a3a3a]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none">
              {activeCount}
            </span>
          )}
          {panelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Sortierung */}
        <div className="flex items-center gap-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-1 py-1">
          {(Object.keys(SORT_FIELD_LABELS) as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                sort.field === field
                  ? "bg-[#2a2a2a] text-white"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {SORT_FIELD_LABELS[field]}
              {sort.field === field &&
                (sort.direction === "asc" ? (
                  <ArrowUp className="w-2.5 h-2.5" />
                ) : (
                  <ArrowDown className="w-2.5 h-2.5" />
                ))}
            </button>
          ))}
        </div>

        {/* Speichern */}
        {activeCount > 0 && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] text-zinc-400 hover:text-white transition-colors"
          >
            <Save className="w-3 h-3" /> Speichern
          </button>
        )}

        {/* Reset */}
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-transparent text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" /> Zurücksetzen
          </button>
        )}
      </div>

      {/* ── Aktive-Filter-Badges ── */}
      {badges.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {badges.map((b) => (
            <span
              key={b.key}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300"
            >
              {b.label}
              <button
                onClick={() => setField(b.key, "")}
                className="text-blue-400 hover:text-white transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Filter-Panel ── */}
      {panelOpen && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a]"
              >
                <option value="">Alle</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Priorität */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Priorität</label>
              <select
                value={filters.priority}
                onChange={(e) => setField("priority", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a]"
              >
                <option value="">Alle</option>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Zugewiesen */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Zugewiesen</label>
              <select
                value={filters.assigneeId}
                onChange={(e) => setField("assigneeId", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a]"
              >
                <option value="">Alle</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Label</label>
              <select
                value={filters.labelId}
                onChange={(e) => setField("labelId", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a]"
              >
                <option value="">Alle</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Meilenstein */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Meilenstein</label>
              <select
                value={filters.milestoneId}
                onChange={(e) => setField("milestoneId", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a]"
              >
                <option value="">Alle</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            {/* Fälligkeit Von */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Fällig ab</label>
              <input
                type="date"
                value={filters.dueDateFrom}
                onChange={(e) => setField("dueDateFrom", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a] [color-scheme:dark]"
              />
            </div>

            {/* Fälligkeit Bis */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Fällig bis</label>
              <input
                type="date"
                value={filters.dueDateTo}
                onChange={(e) => setField("dueDateTo", e.target.value)}
                className="w-full bg-[#252525] border border-[#3a3a3a] text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none hover:border-[#4a4a4a] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Filter-Speichern-Dialog ── */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-400" />
                Filter speichern
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="z.B. Meine offenen Tasks"
              autoFocus
              className="w-full bg-[#252525] border border-[#3a3a3a] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#4a4a4a] placeholder-zinc-600"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg border border-[#2a2a2a] transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task-Sortierung ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortTasks<T extends {
  title: string;
  priority: string;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>(tasks: T[], sort: SortState): T[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    switch (sort.field) {
      case "title":
        return dir * a.title.localeCompare(b.title, "de");
      case "priority":
        return dir * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
      case "dueDate": {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : dir > 0 ? Infinity : -Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : dir > 0 ? Infinity : -Infinity;
        return dir * (da - db);
      }
      case "createdAt":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "updatedAt":
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      default:
        return 0;
    }
  });
}
