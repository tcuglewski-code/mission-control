"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ThumbsUp, ThumbsDown, Plus, Trash2, ArrowRight, RotateCcw, ChevronLeft, Smile, Frown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface SprintItem {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  storyPoints: number | null;
  completedPoints: number | null;
  tasks: { id: string; status: string; storyPoints: number | null }[];
}

interface RetroItem {
  id: string;
  retroId: string;
  type: string;
  text: string;
  votes: number;
  createdAt: string;
}

interface Retro {
  id: string;
  sprintId: string;
  createdAt: string;
  items: RetroItem[];
}

interface Props {
  project: { id: string; name: string; color: string };
  sprints: SprintItem[];
  initialRetro: Retro | null;
  initialSprintId: string | null;
}

// ─── Sektion-Konfiguration ───────────────────────────────────────────────────

const SECTIONS = [
  {
    type: "gut",
    label: "Was lief gut?",
    icon: Smile,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    inputBorder: "focus:border-emerald-500/50",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
  },
  {
    type: "schlecht",
    label: "Was lief nicht gut?",
    icon: Frown,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    inputBorder: "focus:border-red-500/50",
    badgeBg: "bg-red-500/15 border-red-500/30",
  },
  {
    type: "verbesserung",
    label: "Was verbessern wir?",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    inputBorder: "focus:border-blue-500/50",
    badgeBg: "bg-blue-500/15 border-blue-500/30",
  },
] as const;

// ─── Main Component ──────────────────────────────────────────────────────────

export function RetrospectiveClient({ project, sprints, initialRetro, initialSprintId }: Props) {
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(initialSprintId);
  const [retro, setRetro] = useState<Retro | null>(initialRetro);
  const [inputs, setInputs] = useState<Record<string, string>>({ gut: "", schlecht: "", verbesserung: "" });
  const [loading, setLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState<string | null>(null);

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);

  // ─── Retrospektive laden / erstellen ────────────────────────────────────

  const loadOrCreate = useCallback(async (sprintId: string) => {
    setLoading(true);
    try {
      // Prüfe ob bereits vorhanden
      const checkRes = await fetch(`/api/retrospectives?sprintId=${sprintId}`);
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        setRetro(existing[0]);
        return;
      }

      // Neue erstellen
      const res = await fetch("/api/retrospectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
      if (res.ok) setRetro(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSprint = async (sprintId: string) => {
    setSelectedSprintId(sprintId);
    setRetro(null);
    await loadOrCreate(sprintId);
  };

  // ─── Item hinzufügen ────────────────────────────────────────────────────

  const handleAddItem = async (type: string) => {
    if (!retro || !inputs[type]?.trim()) return;
    const res = await fetch(`/api/retrospectives/${retro.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, text: inputs[type].trim() }),
    });
    if (res.ok) {
      const item: RetroItem = await res.json();
      setRetro((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
      setInputs((prev) => ({ ...prev, [type]: "" }));
    }
  };

  // ─── Item löschen ───────────────────────────────────────────────────────

  const handleDeleteItem = async (itemId: string) => {
    if (!retro) return;
    await fetch(`/api/retrospectives/${retro.id}/items/${itemId}`, { method: "DELETE" });
    setRetro((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev);
  };

  // ─── Abstimmen ──────────────────────────────────────────────────────────

  const handleVote = async (itemId: string, delta: 1 | -1) => {
    if (!retro) return;
    const res = await fetch(`/api/retrospectives/${retro.id}/items/${itemId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    if (res.ok) {
      const updated: RetroItem = await res.json();
      setRetro((prev) =>
        prev ? { ...prev, items: prev.items.map((i) => i.id === itemId ? updated : i) } : prev
      );
    }
  };

  // ─── Als Task anlegen ───────────────────────────────────────────────────

  const handleCreateTask = async (item: RetroItem) => {
    setCreatingTask(item.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Retro] ${item.text}`,
          description: `Aktionspunkt aus Sprint-Retrospektive (${selectedSprint?.name ?? ""})`,
          status: "todo",
          priority: "medium",
          projectId: project.id,
        }),
      });
      if (res.ok) {
        alert(`Task "${item.text.slice(0, 40)}..." wurde erstellt.`);
      }
    } finally {
      setCreatingTask(null);
    }
  };

  // ─── Sprint-Velocity-Daten ───────────────────────────────────────────────

  const velocityData = sprints
    .filter((s) => s.status === "completed")
    .slice(0, 8)
    .reverse()
    .map((s) => {
      const doneSP = s.tasks.filter((t) => t.status === "done").reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
      return { name: s.name, velocity: doneSP };
    });

  const maxVelocity = Math.max(...velocityData.map((v) => v.velocity), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Navigation */}
      <Link
        href={`/projects/${project.id}/sprints`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Zurück zu Sprints
      </Link>

      {/* Sprint-Auswahl */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Sprint auswählen</h2>
        <div className="flex flex-wrap gap-2">
          {sprints.length === 0 ? (
            <p className="text-xs text-zinc-500">Keine Sprints vorhanden.</p>
          ) : (
            sprints.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSprint(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border transition-all",
                  selectedSprintId === s.id
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#252525] border-[#3a3a3a] text-zinc-300 hover:border-emerald-500/30"
                )}
              >
                {s.name}
                {s.status === "completed" && (
                  <span className="ml-1.5 text-[10px] text-zinc-500">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Velocity Chart */}
      {velocityData.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Sprint-Velocity (abgeschlossene Sprints)
          </h2>
          <div className="flex items-end gap-3 h-32">
            {velocityData.map((v, i) => {
              const pct = maxVelocity > 0 ? (v.velocity / maxVelocity) * 100 : 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{v.velocity}</span>
                  <div
                    className="w-full rounded-t-md bg-blue-500/60 transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${v.name}: ${v.velocity} SP`}
                  />
                  <span className="text-[9px] text-zinc-600 truncate w-full text-center">
                    {v.name.replace(/sprint\s*/i, "S")}
                  </span>
                </div>
              );
            })}
          </div>
          {velocityData.length > 1 && (
            <p className="text-[10px] text-zinc-500 mt-2">
              Ø Velocity: {Math.round(velocityData.reduce((a, v) => a + v.velocity, 0) / velocityData.length)} SP/Sprint
            </p>
          )}
        </div>
      )}

      {/* Retrospektive-Formular */}
      {loading && (
        <div className="text-center text-zinc-500 text-sm py-8">Lade Retrospektive...</div>
      )}

      {!selectedSprintId && !loading && (
        <div className="text-center text-zinc-600 text-sm py-12">
          Wähle einen Sprint aus, um die Retrospektive zu starten.
        </div>
      )}

      {retro && selectedSprint && (
        <>
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">Retrospektive: {selectedSprint.name}</p>
                <p className="text-xs text-zinc-500">
                  {selectedSprint.endDate
                    ? format(new Date(selectedSprint.endDate), "d. MMMM yyyy", { locale: de })
                    : "Kein Enddatum"}
                </p>
              </div>
            </div>
          </div>

          {/* Drei Sektionen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const items = retro.items.filter((i) => i.type === section.type);
              const sortedItems = [...items].sort((a, b) => b.votes - a.votes);

              return (
                <div
                  key={section.type}
                  className={cn("rounded-xl border p-4 space-y-3", section.bg)}
                >
                  {/* Sektion-Header */}
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", section.color)} />
                    <h3 className={cn("text-sm font-semibold", section.color)}>
                      {section.label}
                    </h3>
                    <span className="ml-auto text-[10px] text-zinc-600 bg-[#252525] px-1.5 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {sortedItems.length === 0 ? (
                      <p className="text-[11px] text-zinc-600 italic">Noch keine Einträge</p>
                    ) : (
                      sortedItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 group"
                        >
                          <p className="text-xs text-zinc-200 mb-2 leading-snug">{item.text}</p>
                          <div className="flex items-center gap-1.5">
                            {/* Voting */}
                            <button
                              onClick={() => handleVote(item.id, 1)}
                              className="flex items-center gap-0.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="Dafür stimmen"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <span className={cn(
                              "text-[11px] font-semibold min-w-[1.5rem] text-center",
                              item.votes > 0 ? "text-emerald-400" : item.votes < 0 ? "text-red-400" : "text-zinc-500"
                            )}>
                              {item.votes > 0 ? `+${item.votes}` : item.votes}
                            </span>
                            <button
                              onClick={() => handleVote(item.id, -1)}
                              className="flex items-center gap-0.5 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                              title="Dagegen stimmen"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>

                            {/* Als Task anlegen */}
                            {section.type === "verbesserung" && (
                              <button
                                onClick={() => handleCreateTask(item)}
                                disabled={creatingTask === item.id}
                                className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-blue-400 transition-colors"
                                title="Als Task anlegen"
                              >
                                <ArrowRight className="w-3 h-3" />
                                {creatingTask === item.id ? "..." : "Als Task"}
                              </button>
                            )}

                            {/* Löschen */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className={cn(
                                "flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100",
                                section.type !== "verbesserung" && "ml-auto"
                              )}
                              title="Löschen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Neuer Eintrag */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputs[section.type] ?? ""}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [section.type]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem(section.type)}
                      placeholder="Eintrag hinzufügen..."
                      className={cn(
                        "flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none",
                        section.inputBorder
                      )}
                    />
                    <button
                      onClick={() => handleAddItem(section.type)}
                      disabled={!inputs[section.type]?.trim()}
                      className="p-1.5 bg-[#252525] border border-[#3a3a3a] hover:border-emerald-500/40 disabled:opacity-40 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-zinc-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zusammenfassung */}
          {retro.items.length > 0 && (
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Zusammenfassung</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {SECTIONS.map((s) => {
                  const count = retro.items.filter((i) => i.type === s.type).length;
                  const Icon = s.icon;
                  return (
                    <div key={s.type}>
                      <Icon className={cn("w-5 h-5 mx-auto mb-1", s.color)} />
                      <div className="text-xl font-bold text-white">{count}</div>
                      <div className="text-[10px] text-zinc-500">{s.label}</div>
                    </div>
                  );
                })}
              </div>
              {retro.items.filter((i) => i.type === "verbesserung" && i.votes > 0).length > 0 && (
                <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                  <p className="text-xs text-zinc-400 mb-2">Top Aktionspunkte (nach Votes):</p>
                  <ul className="space-y-1">
                    {retro.items
                      .filter((i) => i.type === "verbesserung")
                      .sort((a, b) => b.votes - a.votes)
                      .slice(0, 3)
                      .map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="text-blue-400">→</span>
                          <span className="text-zinc-300">{item.text}</span>
                          {item.votes > 0 && (
                            <span className="ml-auto text-emerald-400 text-[10px] font-mono">+{item.votes}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
