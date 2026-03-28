"use client";

import { useEffect, useState } from "react";
import {
  LayoutTemplate,
  Plus,
  ChevronDown,
  Trees,
  Scissors,
  Wheat,
  Package,
  CheckSquare,
  X,
  FolderKanban,
  Check,
  Loader2,
} from "lucide-react";

interface TemplateTask {
  title: string;
  description?: string;
  priority?: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tasks: TemplateTask[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  aufforstung: "Aufforstung",
  pflege: "Waldpflege",
  saatgut: "Saatguternte",
};

const CATEGORY_COLORS: Record<string, string> = {
  aufforstung: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pflege: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  saatgut: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function CategoryIcon({ category }: { category: string | null }) {
  switch (category) {
    case "aufforstung":
      return <Trees className="w-5 h-5 text-emerald-400" />;
    case "pflege":
      return <Scissors className="w-5 h-5 text-blue-400" />;
    case "saatgut":
      return <Wheat className="w-5 h-5 text-amber-400" />;
    default:
      return <Package className="w-5 h-5 text-zinc-400" />;
  }
}

// ─── Modal: Neue Vorlage ──────────────────────────────────────────────────────

interface NewTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (t: Template) => void;
}

function NewTemplateModal({ open, onClose, onCreated }: NewTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [taskInputs, setTaskInputs] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function addTaskRow() {
    setTaskInputs((prev) => [...prev, ""]);
  }

  function updateTask(idx: number, val: string) {
    setTaskInputs((prev) => prev.map((t, i) => (i === idx ? val : t)));
  }

  function removeTask(idx: number) {
    setTaskInputs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validTasks = taskInputs.filter((t) => t.trim());
    if (!name.trim()) { setError("Name ist erforderlich"); return; }
    if (validTasks.length === 0) { setError("Mindestens ein Task erforderlich"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          tasks: validTasks.map((t) => ({ title: t.trim(), priority: "medium" })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }
      const template = await res.json();
      onCreated(template);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a]">
          <h2 className="font-semibold text-gray-900 dark:text-white">Neue Vorlage erstellen</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Name *</label>
            <input
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Aufforstung Nord"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Beschreibung</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Vorlage"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Kategorie</label>
            <select
              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Keine Kategorie</option>
              <option value="aufforstung">Aufforstung</option>
              <option value="pflege">Waldpflege</option>
              <option value="saatgut">Saatguternte</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-2">Tasks *</label>
            <div className="space-y-2">
              {taskInputs.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-zinc-600 w-5 text-right">{idx + 1}.</span>
                  <input
                    className="flex-1 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    value={task}
                    onChange={(e) => updateTask(idx, e.target.value)}
                    placeholder={`Task ${idx + 1}`}
                  />
                  {taskInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask(idx)}
                      className="text-gray-400 dark:text-zinc-600 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addTaskRow}
              className="mt-2 text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Task hinzufügen
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Vorlage speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Projekt auswählen ─────────────────────────────────────────────────

interface ApplyTemplateModalProps {
  template: Template | null;
  projects: Project[];
  onClose: () => void;
}

function ApplyTemplateModal({ template, projects, onClose }: ApplyTemplateModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  if (!template) return null;

  async function handleApply() {
    if (!selectedProjectId) { setError("Bitte ein Projekt auswählen"); return; }
    setError("");
    setApplying(true);
    try {
      const res = await fetch(`/api/templates/${template!.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Anwenden");
      }
      const data = await res.json();
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a]">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Vorlage anwenden</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{template.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600 dark:text-zinc-300 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{template.tasks.length} Tasks</span> werden ins Projekt kopiert:
                </p>
                <ul className="text-xs text-gray-500 dark:text-zinc-500 space-y-1 pl-4 list-disc">
                  {template.tasks.slice(0, 4).map((t, i) => (
                    <li key={i}>{t.title}</li>
                  ))}
                  {template.tasks.length > 4 && (
                    <li>+ {template.tasks.length - 4} weitere…</li>
                  )}
                </ul>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-2">
                  <FolderKanban className="w-4 h-4 inline mr-1" />
                  Projekt auswählen
                </label>
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-zinc-500">Keine Projekte vorhanden</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                          selectedProjectId === p.id
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : "bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-[#3a3a3a]"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                        {selectedProjectId === p.id && (
                          <Check className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || !selectedProjectId}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tasks erstellen
                </button>
              </div>
            </>
          )}

          {success && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  onApply: (t: Template) => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const categoryLabel = template.category ? (CATEGORY_LABELS[template.category] ?? template.category) : null;
  const categoryColor = template.category ? (CATEGORY_COLORS[template.category] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20") : null;

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 hover:border-gray-300 dark:hover:border-[#3a3a3a] transition-colors flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#252525] flex items-center justify-center shrink-0">
          <CategoryIcon category={template.category} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{template.name}</h3>
          {template.description && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-snug">{template.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {categoryLabel && categoryColor && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColor}`}>
            {categoryLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-[#333]">
          <CheckSquare className="w-3 h-3" />
          {template.tasks.length} Tasks
        </span>
      </div>

      {/* Tasks (collapsible) */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Tasks ausblenden" : "Tasks anzeigen"}
        </button>

        {expanded && (
          <ol className="mt-2 space-y-1 pl-4 list-decimal">
            {template.tasks.map((task, i) => (
              <li key={i} className="text-xs text-gray-600 dark:text-zinc-400">
                {task.title}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Action */}
      <button
        onClick={() => onApply(template)}
        className="mt-auto w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <FolderKanban className="w-4 h-4" />
        Auf Projekt anwenden
      </button>
    </div>
  );
}

// ─── Hauptseite ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [applyTarget, setApplyTarget] = useState<Template | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([tplData, projData]) => {
        setTemplates(Array.isArray(tplData) ? tplData : []);
        setProjects(Array.isArray(projData) ? projData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleTemplateCreated(t: Template) {
    setTemplates((prev) => [...prev, t]);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Projekt-Vorlagen</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Wiederverwendbare Task-Sets für häufige Projekttypen
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Vorlage
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutTemplate className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" />
          <p className="text-gray-500 dark:text-zinc-400 text-sm">Noch keine Vorlagen vorhanden.</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 text-emerald-500 hover:text-emerald-400 text-sm"
          >
            Erste Vorlage erstellen →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onApply={setApplyTarget} />
          ))}
        </div>
      )}

      {/* Modals */}
      <NewTemplateModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleTemplateCreated}
      />
      <ApplyTemplateModal
        template={applyTarget}
        projects={projects}
        onClose={() => setApplyTarget(null)}
      />
    </div>
  );
}
