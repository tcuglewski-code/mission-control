"use client";

import { useState, useMemo } from "react";
import { Plus, Search, FileText, X, ChevronDown } from "lucide-react";
import { DocCard } from "@/components/docs/DocCard";
import type { Document } from "@/store/useAppStore";

const DOC_CATEGORIES = [
  { value: "all", label: "Alle" },
  { value: "prompts", label: "Prompts" },
  { value: "spec", label: "Spezifikationen" },
  { value: "report", label: "Reports" },
  { value: "concept", label: "Konzepte" },
  { value: "doc", label: "Sonstiges" },
  { value: "architecture", label: "Architektur" },
  { value: "api", label: "API" },
  { value: "guide", label: "Anleitung" },
];

const DOC_TYPES_CREATE = ["doc", "architecture", "api", "guide", "spec", "report", "concept", "prompts"];

type SortOption = "newest" | "oldest" | "alphabetical";

interface DocsClientProps {
  initialDocs: Document[];
  projects: { id: string; name: string }[];
}

function renderMarkdown(content: string): string {
  // Simple markdown-like rendering
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1 class="text-lg font-bold text-white mt-4 mb-2">${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2 class="text-base font-semibold text-white mt-3 mb-1">${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3 class="text-sm font-semibold text-zinc-200 mt-2 mb-1">${line.slice(4)}</h3>`;
      if (line.startsWith("- ")) return `<li class="ml-4 text-zinc-400 text-sm list-disc">${line.slice(2)}</li>`;
      if (line.trim() === "") return `<br/>`;
      // Bold
      const boldified = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      return `<p class="text-zinc-400 text-sm leading-relaxed">${boldified}</p>`;
    })
    .join("\n");
}

export function DocsClient({ initialDocs, projects }: DocsClientProps) {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "doc", tags: "", projectId: "" });
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = docs.filter((d) => {
      const matchSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || d.type === categoryFilter;
      return matchSearch && matchCat;
    });

    if (sortOption === "newest") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === "oldest") {
      result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortOption === "alphabetical") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [docs, search, categoryFilter, sortOption]);

  const openCreate = () => {
    setEditDoc(null);
    setForm({ title: "", content: "", type: "doc", tags: "", projectId: "" });
    setShowModal(true);
  };

  const openEdit = (doc: Document) => {
    setEditDoc(doc);
    setForm({
      title: doc.title,
      content: doc.content,
      type: doc.type,
      tags: doc.tags ?? "",
      projectId: doc.projectId ?? "",
    });
    setShowModal(true);
    setViewDoc(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editDoc) {
        const res = await fetch("/api/docs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editDoc.id, ...form }),
        });
        if (res.ok) {
          const updated = await res.json();
          setDocs(docs.map((d) => (d.id === editDoc.id ? updated : d)));
        }
      } else {
        const res = await fetch("/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setDocs([created, ...docs]);
        }
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Dokument wirklich löschen?")) return;
    const res = await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocs(docs.filter((d) => d.id !== id));
      setViewDoc(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
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

          {/* Category Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {DOC_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  categoryFilter === cat.value ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500/50 pr-7"
            >
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
              <option value="alphabetical">Alphabetisch</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Neues Dokument
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Dokumente</p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 text-xs text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
          >
            Erstes Dokument erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              onEdit={() => openEdit(doc)}
              onDelete={() => handleDelete(doc.id)}
              onClick={() => setViewDoc(doc)}
            />
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-white">{viewDoc.title}</h2>
                <span className="text-xs text-zinc-500 capitalize">{viewDoc.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(viewDoc)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
                >
                  Bearbeiten
                </button>
                <button onClick={() => setViewDoc(null)} className="text-zinc-500 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose-custom space-y-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(viewDoc.content) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">
                {editDoc ? "Dokument bearbeiten" : "Neues Dokument"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Dokumenttitel..."
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Typ</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {DOC_TYPES_CREATE.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Projekt</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Kein Projekt</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
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
                <label className="text-xs text-zinc-400 mb-1 block">Inhalt *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="# Titel&#10;&#10;Inhalt..."
                  rows={14}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
                  required
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
                  {loading ? "Speichern..." : editDoc ? "Aktualisieren" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
