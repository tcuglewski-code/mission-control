"use client";

import { useEffect, useState, useCallback } from "react";
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
  Copy,
  Pencil,
  Shield,
  User,
  CalendarDays,
  Users,
  Trash2,
  Star,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateTask {
  title: string;
  description?: string;
  priority?: string;
  offsetDays?: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tasks: TemplateTask[];
  isSystem: boolean;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  aufforstung: "Aufforstung",
  pflege: "Waldpflege",
  saatgut: "Saatguternte",
  allgemein: "Allgemein",
};

const CATEGORY_COLORS: Record<string, string> = {
  aufforstung: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pflege: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  saatgut: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  allgemein: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function CategoryIcon({ category }: { category: string | null }) {
  switch (category) {
    case "aufforstung": return <Trees className="w-5 h-5 text-emerald-400" />;
    case "pflege": return <Scissors className="w-5 h-5 text-blue-400" />;
    case "saatgut": return <Wheat className="w-5 h-5 text-amber-400" />;
    default: return <Package className="w-5 h-5 text-zinc-400" />;
  }
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Modal: Projekt aus Vorlage erstellen ────────────────────────────────────

interface CreateProjectModalProps {
  template: Template | null;
  teamMembers: TeamMember[];
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function CreateProjectModal({ template, teamMembers, onClose, onCreated }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [color, setColor] = useState("#22c55e");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (template) {
      setProjectName(template.name);
      setProjectDescription(template.description || "");
    }
  }, [template]);

  if (!template) return null;

  function toggleAssignee(id: string) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    setError("");
    if (!projectName.trim()) { setError("Projektname ist erforderlich"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${template!.id}/create-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectDescription: projectDescription.trim() || null,
          color,
          startDate,
          assigneeIds: selectedAssignees,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Erstellen");
      }
      const data = await res.json();
      setSuccess(data.message);
      setTimeout(() => {
        onCreated(data.project.id);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a] sticky top-0 bg-white dark:bg-[#1a1a1a]">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Projekt aus Vorlage erstellen</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Vorlage: {template.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          ) : (
            <>
              {/* Projektname */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Projektname *</label>
                <input
                  className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="z.B. Aufforstung Nordhanke 2026"
                />
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Beschreibung</label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              {/* Farbe */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-2">Projektfarbe</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#111] ring-white" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Startdatum */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">
                  <CalendarDays className="w-4 h-4 inline mr-1" />
                  Startdatum — Tasks werden relativ verschoben
                </label>
                <input
                  type="date"
                  className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {template.tasks.some((t) => t.offsetDays !== undefined) && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                    {template.tasks.length} Tasks werden ab {new Date(startDate).toLocaleDateString("de-DE")} relativ terminiert
                  </p>
                )}
              </div>

              {/* Assignees */}
              {teamMembers.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Teammitglieder zuweisen (werden allen Tasks zugewiesen)
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleAssignee(member.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                          selectedAssignees.includes(member.id)
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : "bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-[#3a3a3a]"
                        }`}
                      >
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-emerald-400">{getInitials(member.name)}</span>
                          </div>
                        )}
                        <span className="flex-1">{member.name}</span>
                        {selectedAssignees.includes(member.id) && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Task-Vorschau */}
              <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">
                  {template.tasks.length} Tasks werden erstellt:
                </p>
                <ol className="space-y-1 list-decimal pl-4">
                  {template.tasks.slice(0, 5).map((t, i) => (
                    <li key={i} className="text-xs text-gray-500 dark:text-zinc-500">{t.title}</li>
                  ))}
                  {template.tasks.length > 5 && (
                    <li className="text-xs text-gray-400 dark:text-zinc-600">+ {template.tasks.length - 5} weitere…</li>
                  )}
                </ol>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Projekt erstellen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Neue / Vorlage bearbeiten ────────────────────────────────────────

interface EditTemplateModalProps {
  open: boolean;
  template: Template | null; // null = neue Vorlage erstellen
  onClose: () => void;
  onSaved: (t: Template) => void;
}

function EditTemplateModal({ open, template, onClose, onSaved }: EditTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [taskInputs, setTaskInputs] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setCategory(template.category || "");
      setTaskInputs(template.tasks.map((t) => t.title).concat([""]));
    } else {
      setName(""); setDescription(""); setCategory("");
      setTaskInputs(["", "", ""]);
    }
  }, [template, open]);

  if (!open) return null;

  function addTaskRow() { setTaskInputs((prev) => [...prev, ""]); }
  function updateTask(idx: number, val: string) { setTaskInputs((prev) => prev.map((t, i) => (i === idx ? val : t))); }
  function removeTask(idx: number) { setTaskInputs((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validTasks = taskInputs.filter((t) => t.trim());
    if (!name.trim()) { setError("Name ist erforderlich"); return; }
    if (validTasks.length === 0) { setError("Mindestens ein Task erforderlich"); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        tasks: validTasks.map((t, i) => ({ title: t.trim(), priority: "medium", offsetDays: i * 7 })),
      };

      let res: Response;
      if (template) {
        res = await fetch(`/api/templates/${template.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a] sticky top-0 bg-white dark:bg-[#1a1a1a]">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {template ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
          </h2>
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
              <option value="allgemein">Allgemein</option>
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
                    <button type="button" onClick={() => removeTask(idx)} className="text-gray-400 dark:text-zinc-600 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addTaskRow} className="mt-2 text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Task hinzufügen
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Vorlage speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  currentUserId: string | null;
  currentUserRole: string | null;
  onCreateProject: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDuplicate: (t: Template) => void;
  onDelete: (t: Template) => void;
}

function TemplateCard({
  template,
  currentUserId,
  currentUserRole,
  onCreateProject,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const categoryLabel = template.category ? (CATEGORY_LABELS[template.category] ?? template.category) : null;
  const categoryColor = template.category
    ? (CATEGORY_COLORS[template.category] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")
    : null;

  const canEdit = !template.isSystem && (currentUserRole === "admin" || template.createdBy === currentUserId);
  const canDelete = canEdit;

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 hover:border-gray-300 dark:hover:border-[#3a3a3a] transition-colors flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#252525] flex items-center justify-center shrink-0">
          <CategoryIcon category={template.category} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug truncate">{template.name}</h3>
            {template.isSystem && (
              <span title="System-Vorlage" className="shrink-0">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-snug line-clamp-2">{template.description}</p>
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
        {template.isSystem ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Star className="w-3 h-3" />
            System
          </span>
        ) : template.createdByName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-zinc-500 border border-gray-200 dark:border-[#333]">
            <User className="w-3 h-3" />
            {template.createdByName}
          </span>
        ) : null}
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
                {task.offsetDays !== undefined && task.offsetDays > 0 && (
                  <span className="ml-1 text-gray-400 dark:text-zinc-600">(+{task.offsetDays}d)</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className="mt-auto space-y-2">
        {/* Hauptaktion */}
        <button
          onClick={() => onCreateProject(template)}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <FolderKanban className="w-4 h-4" />
          Aus Vorlage erstellen
        </button>

        {/* Sekundäre Aktionen */}
        <div className="flex gap-2">
          <button
            onClick={() => onDuplicate(template)}
            className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2f2f2f] text-gray-600 dark:text-zinc-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            title="Vorlage duplizieren"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplizieren
          </button>
          {canEdit && (
            <button
              onClick={() => onEdit(template)}
              className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2f2f2f] text-gray-600 dark:text-zinc-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              title="Vorlage bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
              Bearbeiten
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(template)}
              className="py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-[#252525] hover:bg-red-500/10 hover:text-red-400 text-gray-500 dark:text-zinc-500 text-xs font-medium transition-colors flex items-center justify-center"
              title="Vorlage löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Modals
  const [createTarget, setCreateTarget] = useState<Template | null>(null);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState<"alle" | "system" | "eigene">("alle");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ])
      .then(([tplData, teamData, meData]) => {
        setTemplates(Array.isArray(tplData) ? tplData : []);
        setTeamMembers(Array.isArray(teamData) ? teamData : []);
        if (meData && !meData.error) {
          setCurrentUserId(meData.id);
          setCurrentUserRole(meData.role);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTemplateSaved = useCallback((t: Template) => {
    setTemplates((prev) => {
      const existing = prev.findIndex((p) => p.id === t.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = t;
        return updated;
      }
      return [...prev, t];
    });
  }, []);

  async function handleDuplicate(t: Template) {
    try {
      const res = await fetch(`/api/templates/${t.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Fehler beim Duplizieren");
      const dup = await res.json();
      setTemplates((prev) => [...prev, dup]);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`Vorlage "${t.name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setTemplates((prev) => prev.filter((p) => p.id !== t.id));
    } catch (err) {
      console.error(err);
    }
  }

  // Gefilterte Vorlagen
  const filtered = templates.filter((t) => {
    if (activeFilter === "system" && !t.isSystem) return false;
    if (activeFilter === "eigene" && (t.isSystem || t.createdBy !== currentUserId)) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  const systemCount = templates.filter((t) => t.isSystem).length;
  const ownCount = templates.filter((t) => !t.isSystem && t.createdBy === currentUserId).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Vorlagen-Bibliothek</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              System-Vorlagen + eigene Vorlagen für forstspezifische Projekte
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

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Typ-Filter */}
        <div className="flex rounded-lg border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
          {(["alle", "system", "eigene"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-[#252525]"
              }`}
            >
              {f === "alle" ? `Alle (${templates.length})` : f === "system" ? `System (${systemCount})` : `Eigene (${ownCount})`}
            </button>
          ))}
        </div>

        {/* Kategorie-Filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
          <select
            className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-gray-600 dark:text-zinc-400 focus:outline-none focus:border-emerald-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Alle Kategorien</option>
            <option value="aufforstung">Aufforstung</option>
            <option value="pflege">Waldpflege</option>
            <option value="saatgut">Saatguternte</option>
            <option value="allgemein">Allgemein</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutTemplate className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" />
          <p className="text-gray-500 dark:text-zinc-400 text-sm">Keine Vorlagen für diese Filter gefunden.</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 text-emerald-500 hover:text-emerald-400 text-sm"
          >
            Neue Vorlage erstellen →
          </button>
        </div>
      ) : (
        <>
          {/* System-Vorlagen Sektion */}
          {(activeFilter === "alle" || activeFilter === "system") && filtered.some((t) => t.isSystem) && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Forstspezifische System-Vorlagen</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.filter((t) => t.isSystem).map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onCreateProject={setCreateTarget}
                    onEdit={setEditTarget}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eigene Vorlagen Sektion */}
          {(activeFilter === "alle" || activeFilter === "eigene") && filtered.some((t) => !t.isSystem) && (
            <div>
              {activeFilter === "alle" && filtered.some((t) => t.isSystem) && (
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Eigene Vorlagen</h2>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.filter((t) => !t.isSystem).map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onCreateProject={setCreateTarget}
                    onEdit={setEditTarget}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateProjectModal
        template={createTarget}
        teamMembers={teamMembers}
        onClose={() => setCreateTarget(null)}
        onCreated={(projectId) => {
          window.location.href = `/projects/${projectId}`;
        }}
      />

      <EditTemplateModal
        open={showNewModal || editTarget !== null}
        template={editTarget}
        onClose={() => { setShowNewModal(false); setEditTarget(null); }}
        onSaved={handleTemplateSaved}
      />
    </div>
  );
}
