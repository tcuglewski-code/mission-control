"use client";

import { useState, useMemo } from "react";
import { Plus, Brain, X, ChevronDown, ChevronRight } from "lucide-react";
import { format, isYesterday, isThisWeek, isThisMonth, differenceInHours } from "date-fns";
import { de } from "date-fns/locale";

interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  type: string;
  tags?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TimeGroup {
  label: string;
  entries: MemoryEntry[];
  collapsed: boolean;
}

interface MemoryClientProps {
  initialEntries: MemoryEntry[];
}

function renderMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Timestamp lines like "## 09:00 — Thema" or "### 09:00 Uhr"
      if (/^#{1,3}\s+\d{1,2}:\d{2}/.test(line)) {
        const text = line.replace(/^#+\s+/, "");
        return `<h3 class="flex items-center gap-2 text-sm font-semibold text-emerald-400 mt-6 mb-2">
          <span class="text-base">🕐</span>
          <span>${text}</span>
        </h3>`;
      }
      if (line.startsWith("# "))
        return `<h1 class="text-xl font-bold text-white mt-6 mb-2 leading-tight">${line.slice(2)}</h1>`;
      if (line.startsWith("## "))
        return `<h2 class="text-lg font-semibold text-white mt-5 mb-2 leading-tight">${line.slice(3)}</h2>`;
      if (line.startsWith("### "))
        return `<h3 class="text-base font-semibold text-zinc-200 mt-4 mb-1">${line.slice(4)}</h3>`;
      if (line.startsWith("- ") || line.startsWith("* "))
        return `<div class="flex gap-2 my-0.5"><span class="text-zinc-500 mt-1 shrink-0">•</span><span class="text-zinc-300 text-sm leading-relaxed">${line.slice(2)}</span></div>`;
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s(.*)/)!;
        return `<div class="flex gap-2 my-0.5"><span class="text-zinc-500 text-sm shrink-0">${num[1]}.</span><span class="text-zinc-300 text-sm leading-relaxed">${num[2]}</span></div>`;
      }
      if (line.trim() === "") return `<div class="h-3"></div>`;
      const processed = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-zinc-200 italic">$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-[#2a2a2a] px-1 py-0.5 rounded text-emerald-400 text-xs font-mono">$1</code>');
      return `<p class="text-zinc-300 text-sm leading-relaxed my-0.5">${processed}</p>`;
    })
    .join("");
}

function groupByTimePeriod(entries: MemoryEntry[]): Omit<TimeGroup, "collapsed">[] {
  const now = new Date();
  const groups: { label: string; entries: MemoryEntry[] }[] = [];

  const buckets = new Map<string, MemoryEntry[]>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    let label: string;

    if (isYesterday(d)) {
      label = "Gestern";
    } else if (isThisWeek(d, { weekStartsOn: 1 }) && !isYesterday(d)) {
      label = "Diese Woche";
    } else if (isThisMonth(d)) {
      label = "Diesen Monat";
    } else {
      label = format(d, "MMMM yyyy", { locale: de });
    }

    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(entry);
  }

  // Ensure order: Gestern → Diese Woche → Diesen Monat → older months
  const orderedLabels: string[] = [];
  if (buckets.has("Gestern")) orderedLabels.push("Gestern");
  if (buckets.has("Diese Woche")) orderedLabels.push("Diese Woche");
  if (buckets.has("Diesen Monat")) orderedLabels.push("Diesen Monat");
  for (const key of buckets.keys()) {
    if (!["Gestern", "Diese Woche", "Diesen Monat"].includes(key)) {
      orderedLabels.push(key);
    }
  }

  for (const label of orderedLabels) {
    groups.push({ label, entries: buckets.get(label)! });
  }

  return groups;
}

function estimateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function formatKB(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  return (bytes / 1024).toFixed(1) + " KB";
}

function getDayOfWeek(date: Date): string {
  return format(date, "EEEE", { locale: de });
}

function formatEntryDate(date: Date): string {
  return format(date, "EE, d. MMM", { locale: de });
}

function timeAgo(date: Date): string {
  const hours = differenceInHours(new Date(), date);
  if (hours < 1) return "vor wenigen Min.";
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days !== 1 ? "en" : ""}`;
}

export function MemoryClient({ initialEntries }: MemoryClientProps) {
  const [entries, setEntries] = useState<MemoryEntry[]>(initialEntries);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<MemoryEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [selectedLongterm, setSelectedLongterm] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    type: "journal",
    tags: "",
    source: "",
  });
  const [loading, setLoading] = useState(false);

  const journalEntries = useMemo(
    () => entries.filter((e) => e.type === "journal").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  );

  const longtermEntries = useMemo(
    () => entries.filter((e) => e.type === "longterm").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [entries]
  );

  const timeGroups = useMemo(() => groupByTimePeriod(journalEntries), [journalEntries]);

  const longtermWordCount = useMemo(
    () => longtermEntries.reduce((acc, e) => acc + estimateWordCount(e.content), 0),
    [longtermEntries]
  );

  const longtermLastUpdated = useMemo(() => {
    if (!longtermEntries.length) return null;
    return longtermEntries[0].updatedAt;
  }, [longtermEntries]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const openCreate = (type: "journal" | "longterm" = "journal") => {
    setEditEntry(null);
    setForm({ title: "", content: "", category: "general", type, tags: "", source: "" });
    setShowModal(true);
  };

  const openEdit = (entry: MemoryEntry) => {
    setEditEntry(entry);
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      type: entry.type,
      tags: entry.tags ?? "",
      source: entry.source ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editEntry) {
        const res = await fetch("/api/memory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editEntry.id, ...form }),
        });
        if (res.ok) {
          const updated = await res.json();
          setEntries(entries.map((e) => (e.id === editEntry.id ? updated : e)));
          if (selectedEntry?.id === editEntry.id) setSelectedEntry(updated);
        }
      } else {
        const res = await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setEntries([created, ...entries]);
          if (created.type === "journal") {
            setSelectedEntry(created);
            setSelectedLongterm(false);
          }
        }
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Memory-Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries(entries.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
    }
  };

  return (
    <div className="flex h-full">
      {/* ─── LEFT PANEL ─── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[#2a2a2a] h-full overflow-hidden">
        {/* Langzeit-Gedächtnis pinned entry */}
        <button
          onClick={() => { setSelectedLongterm(true); setSelectedEntry(null); }}
          className={`flex items-start gap-3 px-4 py-3.5 border-b border-[#2a2a2a] transition-colors text-left w-full ${
            selectedLongterm ? "bg-[#252525]" : "hover:bg-[#1e1e1e]"
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Brain className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">Langzeit-Gedächtnis</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {longtermWordCount.toLocaleString("de-DE")} Wörter
              {longtermLastUpdated && ` · ${timeAgo(new Date(longtermLastUpdated))}`}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); openCreate("longterm"); }}
            className="p-1 text-zinc-600 hover:text-white rounded transition-colors shrink-0"
            title="Neuer Langzeit-Eintrag"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </button>

        {/* Journal label + count */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Tagesjournal
          </span>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#2a2a2a] text-zinc-500 rounded text-[10px]">
              {journalEntries.length}
            </span>
            <button
              onClick={() => openCreate("journal")}
              className="p-1 text-zinc-600 hover:text-white rounded transition-colors"
              title="Neuer Journal-Eintrag"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Time Groups */}
        <div className="flex-1 overflow-y-auto py-1">
          {journalEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-zinc-600 text-xs">Keine Journal-Einträge</p>
              <button
                onClick={() => openCreate("journal")}
                className="mt-2 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                Ersten Eintrag erstellen
              </button>
            </div>
          ) : (
            timeGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.label);
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-[#1e1e1e] transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold text-zinc-500 flex-1">{group.label}</span>
                    <span className="text-[10px] text-zinc-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
                      {group.entries.length}
                    </span>
                  </button>

                  {/* Group entries */}
                  {!isCollapsed && group.entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => { setSelectedEntry(entry); setSelectedLongterm(false); }}
                      className={`w-full text-left px-4 py-2.5 pl-9 transition-colors ${
                        selectedEntry?.id === entry.id ? "bg-[#252525]" : "hover:bg-[#1e1e1e]"
                      }`}
                    >
                      <p className="text-sm text-white font-medium leading-tight">
                        {formatEntryDate(new Date(entry.createdAt))}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {formatKB(entry.content)} · {estimateWordCount(entry.content).toLocaleString("de-DE")} Wörter
                      </p>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedEntry && !selectedLongterm ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-zinc-700" />
            </div>
            <p className="text-zinc-400 text-base font-medium mb-1">Eintrag auswählen →</p>
            <p className="text-zinc-600 text-sm">
              Wähle einen Eintrag aus der Liste links aus
            </p>
          </div>
        ) : selectedLongterm ? (
          /* LONGTERM VIEW */
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#2a2a2a] px-8 py-5 z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white mb-1">🧠 Langzeit-Gedächtnis</h1>
                  <p className="text-xs text-zinc-500">
                    {longtermEntries.length} Einträge · {longtermWordCount.toLocaleString("de-DE")} Wörter gesamt
                    {longtermLastUpdated && ` · Zuletzt aktualisiert ${timeAgo(new Date(longtermLastUpdated))}`}
                  </p>
                </div>
                <button
                  onClick={() => openCreate("longterm")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Neuer Eintrag
                </button>
              </div>
            </div>
            <div className="px-8 py-6 space-y-4 max-w-3xl">
              {longtermEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-zinc-600 text-sm">Noch keine Langzeit-Einträge</p>
                </div>
              ) : (
                longtermEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {entry.category} · {formatKB(entry.content)} · {estimateWordCount(entry.content).toLocaleString("de-DE")} Wörter
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEdit(entry)}
                          className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white hover:bg-[#252525] rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="px-2 py-1 text-[10px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                    <div
                      className="prose-custom"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : selectedEntry ? (
          /* JOURNAL ENTRY VIEW */
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#2a2a2a] px-8 py-5 z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight mb-1">
                    {format(new Date(selectedEntry.createdAt), "yyyy-MM-dd")} —{" "}
                    <span className="text-zinc-400">{getDayOfWeek(new Date(selectedEntry.createdAt))}</span>
                  </h1>
                  <p className="text-xs text-zinc-500">
                    {format(new Date(selectedEntry.createdAt), "d. MMMM yyyy", { locale: de })} ·{" "}
                    {formatKB(selectedEntry.content)} ·{" "}
                    {estimateWordCount(selectedEntry.content).toLocaleString("de-DE")} Wörter
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(selectedEntry)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors border border-[#2a2a2a]"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(selectedEntry.id)}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-[#2a2a2a]"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 max-w-3xl">
              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedEntry.content) }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">
                {editEntry ? "Eintrag bearbeiten" : form.type === "journal" ? "Neuer Journal-Eintrag" : "Neuer Langzeit-Eintrag"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {!editEntry && (
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Typ</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "journal" })}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                        form.type === "journal"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                          : "border-[#3a3a3a] text-zinc-500 hover:text-white"
                      }`}
                    >
                      📖 Journal-Eintrag
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "longterm" })}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                        form.type === "longterm"
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-400 font-medium"
                          : "border-[#3a3a3a] text-zinc-500 hover:text-white"
                      }`}
                    >
                      🧠 Langzeit-Gedächtnis
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Titel..."
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Inhalt *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Inhalt..."
                  rows={8}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Kategorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="general">general</option>
                    <option value="credentials">credentials</option>
                    <option value="architecture">architecture</option>
                    <option value="decisions">decisions</option>
                    <option value="research">research</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Tags</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="tag1,tag2"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Quelle</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="URL oder Dateiname..."
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
                >
                  {loading ? "Speichern..." : editEntry ? "Aktualisieren" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
