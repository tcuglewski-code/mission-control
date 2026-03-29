"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  FolderKanban,
  LayoutTemplate,
  Users,
  CalendarDays,
  DollarSign,
  Trees,
  Scissors,
  FileText,
  Wheat,
  Package,
  X,
  ChevronDown,
  Flag,
  Shield,
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateMilestone {
  title: string;
  description?: string;
  offsetDays?: number;
  color?: string;
}

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
  milestones: TemplateMilestone[] | null;
  isSystem: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function CategoryIcon({ category }: { category: string | null }) {
  const cls = "w-5 h-5";
  switch (category) {
    case "aufforstung": return <Trees className={`${cls} text-emerald-400`} />;
    case "pflege":      return <Scissors className={`${cls} text-blue-400`} />;
    case "foerderung":  return <FileText className={`${cls} text-violet-400`} />;
    case "saatgut":     return <Wheat className={`${cls} text-amber-400`} />;
    default:            return <Package className={`${cls} text-zinc-400`} />;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  aufforstung: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pflege:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  foerderung:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  saatgut:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  allgemein:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  aufforstung: "Aufforstung",
  pflege:      "Waldpflege",
  foerderung:  "Förderung",
  saatgut:     "Saatguternte",
  allgemein:   "Allgemein",
};

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

// ─── Schritt-Anzeige ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: "Grunddaten" },
    { label: "Vorlage" },
    { label: "Team & Details" },
  ];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const num = i + 1;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
                isDone
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : isActive
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                  : "bg-[#252525] border-[#333] text-zinc-500"
              }`}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                isActive ? "text-white" : isDone ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-1 ${isDone ? "bg-emerald-600" : "bg-[#2a2a2a]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Template Vorschau-Karte ──────────────────────────────────────────────────

function TemplatePreviewCard({
  template,
  selected,
  onClick,
}: {
  template: Template;
  selected: boolean;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const catColor = template.category
    ? (CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.allgemein)
    : CATEGORY_COLORS.allgemein;
  const catLabel = template.category
    ? (CATEGORY_LABELS[template.category] ?? template.category)
    : null;
  const milestones = template.milestones ?? [];

  return (
    <div
      onClick={onClick}
      className={`relative border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#252525] flex items-center justify-center shrink-0">
          <CategoryIcon category={template.category} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm leading-snug">{template.name}</h3>
            {template.isSystem && <Shield className="w-3 h-3 text-emerald-400 shrink-0" />}
          </div>
          {catLabel && (
            <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${catColor}`}>
              {catLabel}
            </span>
          )}
          {template.description && (
            <p className="text-xs text-zinc-500 mt-1.5 leading-snug line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3" />
          {template.tasks.length} Tasks
        </span>
        {milestones.length > 0 && (
          <span className="flex items-center gap-1">
            <Flag className="w-3 h-3" />
            {milestones.length} Meilensteine
          </span>
        )}
      </div>

      {/* Vorschau Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Vorschau {expanded ? "ausblenden" : "anzeigen"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Tasks */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Tasks</p>
            <ol className="space-y-1 pl-3 list-decimal text-xs text-zinc-500">
              {template.tasks.slice(0, 6).map((t, i) => (
                <li key={i}>
                  {t.title}
                  {t.priority && t.priority !== "medium" && (
                    <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${
                      t.priority === "urgent" ? "bg-red-500/20 text-red-400" :
                      t.priority === "high"   ? "bg-orange-500/20 text-orange-400" :
                      "bg-zinc-500/20 text-zinc-400"
                    }`}>
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </span>
                  )}
                </li>
              ))}
              {template.tasks.length > 6 && (
                <li className="text-zinc-600">+ {template.tasks.length - 6} weitere Tasks…</li>
              )}
            </ol>
          </div>
          {/* Meilensteine */}
          {milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Meilensteine</p>
              <ul className="space-y-1">
                {milestones.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color ?? "#8b5cf6" }} />
                    {m.title}
                    {m.offsetDays !== undefined && (
                      <span className="text-zinc-600 text-[10px]">({m.offsetDays}d)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

interface OnboardingModalProps {
  projectId: string;
  onClose: () => void;
}

function OnboardingModal({ projectId, onClose }: OnboardingModalProps) {
  const router = useRouter();

  const quickActions = [
    {
      icon: <Users className="w-5 h-5 text-blue-400" />,
      label: "Team einladen",
      description: "Mitarbeiter zum Projekt hinzufügen",
      href: `/projects/${projectId}?tab=team`,
      color: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: <Check className="w-5 h-5 text-emerald-400" />,
      label: "Ersten Task erstellen",
      description: "Aufgaben anlegen und zuweisen",
      href: `/projects/${projectId}?action=new-task`,
      color: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: <Flag className="w-5 h-5 text-violet-400" />,
      label: "Meilenstein setzen",
      description: "Projektziele und Etappen definieren",
      href: `/projects/${projectId}?tab=milestones`,
      color: "bg-violet-500/10 border-violet-500/20",
    },
    {
      icon: <Package className="w-5 h-5 text-amber-400" />,
      label: "Integration einrichten",
      description: "GitHub, Webhooks oder API verbinden",
      href: `/projects/${projectId}/settings`,
      color: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      label: "Report anschauen",
      description: "Projektfortschritt im Überblick",
      href: `/projects/${projectId}/report`,
      color: "bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-[#2a2a2a]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">🎉 Projekt erstellt!</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Checkliste für den Start — was als nächstes?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 space-y-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { router.push(action.href); onClose(); }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl border ${action.color} hover:opacity-80 transition-opacity text-left`}
            >
              <div className="shrink-0">{action.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{action.label}</p>
                <p className="text-xs text-zinc-400">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={() => { router.push(`/projects/${projectId}`); onClose(); }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Zum Projekt gehen →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hauptseite: Multi-Step Wizard ────────────────────────────────────────────

export default function NewProjectWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Formular-Felder
  const [projectName, setProjectName] = useState("");
  const [description, setDescription]   = useState("");
  const [client, setClient]             = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [useEmpty, setUseEmpty] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [budget, setBudget]             = useState("");
  const [color, setColor]               = useState("#22c55e");

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
    ])
      .then(([tplData, teamData]) => {
        setTemplates(Array.isArray(tplData) ? tplData : []);
        setTeamMembers(Array.isArray(teamData) ? teamData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleAssignee(id: string) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  // ─── Projekt erstellen ────────────────────────────────────────────────────

  async function handleCreate() {
    setError("");
    setSaving(true);
    try {
      let projectId: string;

      if (useEmpty || !selectedTemplate) {
        // Leeres Projekt über API anlegen
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            description: description.trim() || null,
            color,
            status: "planning",
            budget: budget ? parseFloat(budget) : undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Fehler beim Erstellen");
        }
        const data = await res.json();
        projectId = data.id;

        // Team-Mitglieder hinzufügen
        if (selectedAssignees.length > 0) {
          await Promise.all(
            selectedAssignees.map((uid) =>
              fetch(`/api/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: uid, role: "member" }),
              })
            )
          );
        }
      } else {
        // Projekt aus Vorlage erstellen
        const res = await fetch(`/api/templates/${selectedTemplate.id}/create-project`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: projectName.trim(),
            projectDescription: description.trim() || null,
            client: client.trim() || null,
            color,
            startDate,
            budget: budget || null,
            assigneeIds: selectedAssignees,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Fehler beim Erstellen");
        }
        const data = await res.json();
        projectId = data.project.id;
      }

      setCreatedProjectId(projectId);
      setShowOnboarding(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Validierung pro Schritt ──────────────────────────────────────────────

  function canProceed() {
    if (step === 1) return projectName.trim().length > 0;
    if (step === 2) return true; // Template ist optional
    return true;
  }

  function handleNext() {
    if (step < 3) setStep((s) => s + 1);
    else handleCreate();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (showOnboarding && createdProjectId) {
    return (
      <OnboardingModal
        projectId={createdProjectId}
        onClose={() => router.push(`/projects/${createdProjectId}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Back */}
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Projekte
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Neues Projekt</h1>
            <p className="text-sm text-zinc-400">In 3 Schritten zum fertigen Projekt</p>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl">
          {/* ── Schritt 1: Grunddaten ── */}
          {step === 1 && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  Schritt 1 — Grunddaten
                </h2>
                <p className="text-sm text-zinc-400">Name, Beschreibung und Kunde eingeben.</p>
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-1.5">Projektname *</label>
                <input
                  autoFocus
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="z.B. Aufforstung Nordhanke 2026"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-1.5">Beschreibung</label>
                <textarea
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Projekts (optional)"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-1.5">Kunde / Auftraggeber</label>
                <input
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="z.B. Familie Müller, Forstamt Bayern"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-2">Projektfarbe</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                        color === c ? "ring-2 ring-offset-2 ring-offset-[#1a1a1a] ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Schritt 2: Template wählen ── */}
          {step === 2 && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  Schritt 2 — Vorlage wählen
                </h2>
                <p className="text-sm text-zinc-400">
                  Wähle eine Vorlage für vorausgefüllte Tasks und Meilensteine — oder starte leer.
                </p>
              </div>

              {/* Leer starten */}
              <button
                onClick={() => { setSelectedTemplate(null); setUseEmpty(true); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  useEmpty
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-[#252525] flex items-center justify-center shrink-0">
                  <FolderKanban className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white text-sm">Leeres Projekt</p>
                  <p className="text-xs text-zinc-500">Ohne Vorlage starten, alles selbst aufbauen</p>
                </div>
                {useEmpty && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Vorlagen */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Forstspezifische Vorlagen ({templates.filter((t) => t.isSystem).length})</span>
                  </div>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {templates
                      .filter((t) => t.isSystem)
                      .map((tpl) => (
                        <TemplatePreviewCard
                          key={tpl.id}
                          template={tpl}
                          selected={selectedTemplate?.id === tpl.id}
                          onClick={() => { setSelectedTemplate(tpl); setUseEmpty(false); }}
                        />
                      ))}
                    {templates.filter((t) => !t.isSystem).length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2">
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          <span>Eigene Vorlagen</span>
                        </div>
                        {templates
                          .filter((t) => !t.isSystem)
                          .map((tpl) => (
                            <TemplatePreviewCard
                              key={tpl.id}
                              template={tpl}
                              selected={selectedTemplate?.id === tpl.id}
                              onClick={() => { setSelectedTemplate(tpl); setUseEmpty(false); }}
                            />
                          ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Schritt 3: Team & Details ── */}
          {step === 3 && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  Schritt 3 — Team & Details
                </h2>
                <p className="text-sm text-zinc-400">
                  Startdatum, Budget und Team festlegen.
                </p>
              </div>

              {/* Startdatum */}
              <div>
                <label className="block text-sm text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-zinc-400" />
                  Startdatum
                  {selectedTemplate && !useEmpty && (
                    <span className="text-xs text-zinc-500">— Tasks werden relativ zum Startdatum terminiert</span>
                  )}
                </label>
                <input
                  type="date"
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-zinc-400" />
                  Geplantes Budget (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="z.B. 15000"
                />
              </div>

              {/* Team */}
              {teamMembers.length > 0 && (
                <div>
                  <label className="block text-sm text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-zinc-400" />
                    Team-Mitglieder hinzufügen
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleAssignee(member.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          selectedAssignees.includes(member.id)
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                            : "bg-[#111] border border-[#2a2a2a] text-zinc-300 hover:border-[#3a3a3a]"
                        }`}
                      >
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-emerald-400">{getInitials(member.name)}</span>
                          </div>
                        )}
                        <span className="flex-1">{member.name}</span>
                        <span className="text-xs text-zinc-600">{member.role}</span>
                        {selectedAssignees.includes(member.id) && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zusammenfassung */}
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Zusammenfassung</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-white font-medium">{projectName}</span>
                </div>
                {client && (
                  <p className="text-xs text-zinc-500">Kunde: {client}</p>
                )}
                {selectedTemplate && !useEmpty ? (
                  <p className="text-xs text-zinc-500">
                    Vorlage: {selectedTemplate.name} ({selectedTemplate.tasks.length} Tasks
                    {(selectedTemplate.milestones?.length ?? 0) > 0 && `, ${selectedTemplate.milestones!.length} Meilensteine`}
                    )
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">Vorlage: Leeres Projekt</p>
                )}
                {budget && <p className="text-xs text-zinc-500">Budget: {parseFloat(budget).toLocaleString("de-DE")} €</p>}
                {selectedAssignees.length > 0 && (
                  <p className="text-xs text-zinc-500">{selectedAssignees.length} Teammitglied(er) ausgewählt</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Footer: Navigation ── */}
          <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
            <button
              onClick={() => step > 1 ? setStep((s) => s - 1) : router.push("/projects")}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#252525] text-zinc-300 hover:bg-[#2f2f2f] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Abbrechen" : "Zurück"}
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 3 ? (
                <>
                  <Check className="w-4 h-4" />
                  Projekt erstellen
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
