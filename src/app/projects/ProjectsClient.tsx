"use client";

import { useState } from "react";
import { Plus, FolderKanban, Archive, ArchiveRestore } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectModal } from "@/components/projects/ProjectModal";
import type { Project } from "@/store/useAppStore";

const STATUS_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Aktiv" },
  { value: "planning", label: "Planung" },
  { value: "paused", label: "Pausiert" },
];

interface ProjectsClientProps {
  initialProjects: Project[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filter, setFilter] = useState("all");
  const [archiveTab, setArchiveTab] = useState<"active" | "archive">("active");
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<Project | null>(null);

  // Trenne aktive und archivierte Projekte
  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const currentProjects = archiveTab === "active" ? activeProjects : archivedProjects;

  const filtered =
    archiveTab === "archive"
      ? archivedProjects
      : filter === "all"
      ? activeProjects
      : activeProjects.filter((p) => p.status === filter);

  const handleSave = async (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
    if (editProject) {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(projects.map((p) => (p.id === editProject.id ? updated : p)));
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

  const handleArchive = async (project: Project) => {
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

  const handleUnarchive = async (project: Project) => {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* Aktiv / Archiv Tabs */}
          <div className="flex items-center gap-1 mb-3">
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

          {/* Status-Filter (nur in Aktiv-Tab) */}
          {archiveTab === "active" && (
            <div className="flex items-center gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    filter === f.value
                      ? "bg-[#252525] text-white"
                      : "text-zinc-500 hover:text-white hover:bg-[#1e1e1e]"
                  }`}
                >
                  {f.label}
                  {f.value !== "all" && (
                    <span className="ml-1.5 text-zinc-600">
                      {activeProjects.filter((p) => p.status === f.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {archiveTab === "active" && (
          <button
            onClick={() => {
              setEditProject(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neues Projekt
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          {archiveTab === "archive" ? (
            <>
              <Archive className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Keine archivierten Projekte</p>
            </>
          ) : (
            <>
              <FolderKanban className="w-10 h-10 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Keine Projekte gefunden</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                Erstes Projekt erstellen
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="relative group/card">
              <ProjectCard project={project} />
              {/* Action Buttons */}
              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 flex gap-1">
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
