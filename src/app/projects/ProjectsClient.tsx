"use client";

import { useState, useMemo } from "react";
import { Plus, FolderKanban, Archive, ArchiveRestore, LayoutGrid, List, Search, SortAsc, Star, Copy, Loader2 } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectModal } from "@/components/projects/ProjectModal";
import type { Project } from "@/store/useAppStore";
import { getStatusLabel, getPriorityLabel } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Aktiv" },
  { value: "planning", label: "Planung" },
  { value: "paused", label: "Pausiert" },
];

type SortKey = "name" | "updatedAt" | "createdAt" | "openTasks";
type ViewMode = "grid" | "list";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "updatedAt", label: "Zuletzt aktiv" },
  { value: "createdAt", label: "Erstelldatum" },
  { value: "openTasks", label: "Offene Tasks" },
];

interface ExtendedProject extends Project {
  isFavorite?: boolean;
  archived?: boolean;
  _count?: { tasks: number; members: number };
}

interface ProjectsClientProps {
  initialProjects: ExtendedProject[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ExtendedProject[]>(initialProjects);
  const [filter, setFilter] = useState("all");
  const [archiveTab, setArchiveTab] = useState<"active" | "archive">("active");
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<ExtendedProject | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<ExtendedProject | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Trenne aktive und archivierte Projekte
  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const filtered = useMemo(() => {
    let base =
      archiveTab === "archive"
        ? archivedProjects
        : filter === "all"
        ? activeProjects
        : activeProjects.filter((p) => p.status === filter);

    // Suche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      );
    }

    // Sortierung
    const sorted = [...base].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "de");
      if (sortKey === "updatedAt")
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortKey === "createdAt")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "openTasks")
        return (b._count?.tasks ?? 0) - (a._count?.tasks ?? 0);
      return 0;
    });

    // Favoriten nach oben (nur im aktiven Tab)
    if (archiveTab === "active") {
      return [
        ...sorted.filter((p) => p.isFavorite),
        ...sorted.filter((p) => !p.isFavorite),
      ];
    }
    return sorted;
  }, [projects, filter, archiveTab, searchQuery, sortKey, activeProjects, archivedProjects]);

  const handleSave = async (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
    if (editProject) {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(projects.map((p) => (p.id === editProject.id ? { ...p, ...updated } : p)));
      }
    } else {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setProjects([created, ...projects]);
      }
    }
    setEditProject(null);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects(projects.filter((p) => p.id !== id));
    }
  };

  const handleArchive = async (project: ExtendedProject) => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects(projects.map((p) => (p.id === project.id ? { ...p, ...updated } : p)));
    }
    setArchiveConfirm(null);
  };

  const handleUnarchive = async (project: ExtendedProject) => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects(projects.map((p) => (p.id === project.id ? { ...p, ...updated } : p)));
    }
  };

  const handleFavoriteToggle = (id: string, isFavorite: boolean) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite } : p))
    );
  };

  const handleDuplicate = async (project: ExtendedProject) => {
    if (duplicatingId) return;
    setDuplicatingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Fehler beim Duplizieren");
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortKey)?.label ?? "Sortieren";

  return (
    <>
      {/* Bestätigungs-Dialog für Archivieren */}
      {archiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Archive className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Projekt archivieren?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Das Projekt wird aus der aktiven Ansicht ausgeblendet.</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300 mb-6">
              <span className="font-medium text-white">{archiveConfirm.name}</span> wird archiviert und kann jederzeit wiederhergestellt werden.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setArchiveConfirm(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg border border-[#2a2a2a] transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleArchive(archiveConfirm)}
                className="px-4 py-2 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
              >
                Archivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 space-y-3">
        {/* Aktiv / Archiv Tabs + Neues Projekt Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setArchiveTab("active")}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                archiveTab === "active"
                  ? "bg-[#252525] text-white"
                  : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
              }`}
            >
              <FolderKanban className="w-3 h-3" />
              Aktiv
              <span className="ml-0.5 text-zinc-600">{activeProjects.length}</span>
            </button>
            <button
              onClick={() => setArchiveTab("archive")}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                archiveTab === "archive"
                  ? "bg-[#252525] text-white"
                  : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
              }`}
            >
              <Archive className="w-3 h-3" />
              Archiv
              {archivedProjects.length > 0 && (
                <span className="ml-0.5 text-zinc-600">{archivedProjects.length}</span>
              )}
            </button>
          </div>

          {archiveTab === "active" && (
            <Link
              href="/projects/new"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Neues Projekt
            </Link>
          )}
        </div>

        {/* Toolbar: Suche + Filter + Sortierung + View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Suche */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Projekte durchsuchen..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Status-Filter (nur Aktiv-Tab) */}
          {archiveTab === "active" && (
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    filter === f.value
                      ? "bg-[#252525] text-white"
                      : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
                  }`}
                >
                  {f.label}
                  {f.value !== "all" && (
                    <span className="ml-1 text-zinc-600">
                      {activeProjects.filter((p) => p.status === f.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {/* Sortierung */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#1e1e1e] rounded-lg border border-[#2a2a2a] transition-colors"
              >
                <SortAsc className="w-3 h-3" />
                {currentSortLabel}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg shadow-xl py-1 min-w-[140px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortKey(opt.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        sortKey === opt.value
                          ? "text-emerald-400 bg-emerald-500/5"
                          : "text-zinc-400 hover:text-white hover:bg-[#252525]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${
                  viewMode === "grid" ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
                }`}
                title="Karten-Ansicht"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${
                  viewMode === "list" ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
                }`}
                title="Listen-Ansicht"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Favoriten-Hinweis */}
      {archiveTab === "active" && filtered.some((p) => p.isFavorite) && (
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[11px] text-zinc-500">
            {filtered.filter((p) => p.isFavorite).length} Favorit
            {filtered.filter((p) => p.isFavorite).length !== 1 ? "en" : ""} oben angeheftet
          </span>
        </div>
      )}

      {/* Projekt-Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          {archiveTab === "archive" ? (
            <>
              <Archive className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Keine archivierten Projekte</p>
            </>
          ) : searchQuery ? (
            <>
              <Search className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Keine Projekte für &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Suche zurücksetzen
              </button>
            </>
          ) : (
            <>
              <FolderKanban className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Keine Projekte gefunden</p>
              <Link
                href="/projects/new"
                className="mt-4 px-4 py-2 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Erstes Projekt erstellen
              </Link>
            </>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="relative group/card">
              <ProjectCard
                project={project}
                onFavoriteToggle={handleFavoriteToggle}
              />
              {/* Action Buttons */}
              <div className="absolute top-3 right-12 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 flex gap-1">
                {/* Duplizieren */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDuplicate(project);
                  }}
                  title="Projekt duplizieren"
                  disabled={duplicatingId === project.id}
                  className="p-1.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md text-zinc-500 hover:text-blue-400 hover:border-blue-500/30 transition-colors disabled:opacity-50"
                >
                  {duplicatingId === project.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {archiveTab === "active" ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setArchiveConfirm(project);
                    }}
                    title="Archivieren"
                    className="p-1.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnarchive(project);
                    }}
                    title="Wiederherstellen"
                    className="p-1.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Listen-Ansicht */
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] text-[11px] text-zinc-500 px-4 py-2 border-b border-[#2a2a2a] gap-4 items-center">
            <span className="w-4" />
            <span>Projekt</span>
            <span className="text-right w-16">Tasks</span>
            <span className="text-right w-20">Fortschritt</span>
            <span className="text-right w-20">Aktualisiert</span>
            <span className="w-16" />
          </div>
          {filtered.map((project) => (
            <div key={project.id} className="group/row border-b border-[#222] last:border-0">
              <Link
                href={`/projects/${project.id}`}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] px-4 py-3 gap-4 items-center hover:bg-[#1a1a1a] transition-colors"
              >
                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                {/* Name + Status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {project.isFavorite && (
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                    )}
                    <span className="text-sm text-white group-hover/row:text-emerald-400 transition-colors truncate">
                      {project.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                      project.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      project.status === "planning" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-[11px] text-zinc-600 truncate mt-0.5">{project.description}</p>
                  )}
                </div>
                {/* Task Count */}
                <span className="text-xs text-zinc-500 w-16 text-right">
                  {project._count?.tasks ?? 0}
                </span>
                {/* Progress Bar */}
                <div className="flex items-center gap-2 w-20 justify-end">
                  <div className="w-12 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${project.progress}%`, backgroundColor: project.color }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 w-7 text-right shrink-0">
                    {project.progress}%
                  </span>
                </div>
                {/* Date */}
                <span className="text-[11px] text-zinc-600 w-20 text-right">
                  {format(new Date(project.updatedAt), "d. MMM", { locale: de })}
                </span>
                {/* Actions */}
                <div className="w-16 flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDuplicate(project);
                    }}
                    title="Projekt duplizieren"
                    disabled={duplicatingId === project.id}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-[#252525] transition-colors disabled:opacity-50"
                  >
                    {duplicatingId === project.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (archiveTab === "active") {
                        setArchiveConfirm(project);
                      } else {
                        handleUnarchive(project);
                      }
                    }}
                    title={archiveTab === "active" ? "Archivieren" : "Wiederherstellen"}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-amber-400 hover:bg-[#252525] transition-colors"
                  >
                    {archiveTab === "active" ? (
                      <Archive className="w-3.5 h-3.5" />
                    ) : (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {(showModal || editProject) && (
        <ProjectModal
          project={editProject}
          onClose={() => {
            setShowModal(false);
            setEditProject(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
