"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Brain, X } from "lucide-react";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { format } from "date-fns";
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

interface MemoryClientProps {
  initialEntries: MemoryEntry[];
}

const CATEGORIES = ["all", "general", "credentials", "architecture", "decisions", "research"];

function groupByDate(entries: MemoryEntry[]): [string, MemoryEntry[]][] {
  const map = new Map<string, MemoryEntry[]>();
  for (const entry of entries) {
    const key = format(new Date(entry.createdAt), "d. MMMM yyyy", { locale: de });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries());
}

export function MemoryClient({ initialEntries }: MemoryClientProps) {
  const [entries, setEntries] = useState<MemoryEntry[]>(initialEntries);
  const [activeTab, setActiveTab] = useState<"journal" | "longterm">("journal");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<MemoryEntry | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    type: "journal",
    tags: "",
    source: "",
  });
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchType = e.type === activeTab;
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || e.category === categoryFilter;
      return matchType && matchSearch && matchCat;
    });
  }, [entries, activeTab, search, categoryFilter]);

  const journalGroups = useMemo(() => groupByDate(filtered), [filtered]);

  const openCreate = () => {
    setEditEntry(null);
    setForm({ title: "", content: "", category: "general", type: activeTab, tags: "", source: "" });
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
    if (res.ok) setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a] pb-4">
        <button
          onClick={() => setActiveTab("journal")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
            activeTab === "journal"
              ? "bg-[#252525] text-white"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          📖 Journal
        </button>
        <button
          onClick={() => setActiveTab("longterm")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
            activeTab === "longterm"
              ? "bg-[#252525] text-white"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          🧠 Langzeit-Gedächtnis
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="pl-9 pr-4 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 w-56"
            />
          </div>
          <div className="flex items-center gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  categoryFilter === cat
                    ? "bg-[#252525] text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {cat === "all" ? "Alle" : cat}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Neuer Eintrag
        </button>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Brain className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Einträge</p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 text-xs text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
          >
            Ersten Eintrag erstellen
          </button>
        </div>
      ) : activeTab === "journal" ? (
        /* Journal: grouped by date */
        <div className="space-y-8">
          {journalGroups.map(([dateLabel, dayEntries]) => (
            <div key={dateLabel}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
              </div>
              {/* 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayEntries.map((entry) => (
                  <MemoryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={() => openEdit(entry)}
                    onDelete={() => handleDelete(entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Longterm: grid by category */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <MemoryCard
              key={entry.id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
              large
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">
                {editEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Type toggle */}
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
                  rows={5}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
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
                    {CATEGORIES.filter((c) => c !== "all").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
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
    </>
  );
}
