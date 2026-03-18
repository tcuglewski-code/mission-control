"use client";

import { useState, useMemo } from "react";
import { Plus, Search, FileText, X, ChevronDown } from "lucide-react";
import type { Document } from "@/store/useAppStore";

const DOC_CATEGORIES = [
  { value: "all", label: "Alle" },
  { value: "journal", label: "Journal" },
  { value: "prompts", label: "Prompts" },
  { value: "spec", label: "Spezifikationen" },
  { value: "report", label: "Reports" },
  { value: "concept", label: "Konzepte" },
  { value: "doc", label: "Sonstiges" },
  { value: "architecture", label: "Architektur" },
  { value: "api", label: "API" },
  { value: "guide", label: "Anleitung" },
];

const DOC_TYPES_CREATE = ["doc", "journal", "architecture", "api", "guide", "spec", "report", "concept", "prompts"];

type SortOption = "newest" | "oldest" | "alphabetical";

const TYPE_COLORS: Record<string, string> = {
  journal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  prompts: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  spec: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  report: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  concept: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  architecture: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  api: "bg-red-500/15 text-red-400 border-red-500/20",
  guide: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  doc: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.doc;
}

interface DocsClientProps {
  initialDocs: Document[];
  projects: { id: string; name: string }[];
}

function renderMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
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

export function DocsClient({ initialDocs, projects }: DocsClientProps) {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
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
          if (selectedDoc?.id === editDoc.id) setSelectedDoc(updated);
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
          setSelectedDoc(created);
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
      if (selectedDoc?.id === id) setSelectedDoc(null);
    }
  };

  const formatBytes = (str: string) => {
    const bytes = new TextEncoder().encode(str).length;
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });

  const getProjectName = (doc: Document) => {
    if (!doc.projectId) return null;
    const p = projects.find((p) => p.id === doc.projectId);
    return p?.name ?? null;
  };

  return (
    <div className="flex h-full">
      {/* ─── LEFT PANEL ─── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-[#2a2a2a] h-full overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dokumente durchsuchen..."
              className="w-full pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>

        {/* Category Filter (horizontal scroll) */}
        <div className="px-3 py-2 border-b border-[#2a2a2a] overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {DOC_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  categoryFilter === cat.value
                    ? "bg-[#2a2a2a] text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort + New button */}
        <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between gap-2">
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2.5 py-1 text-xs text-zinc-400 focus:outline-none pr-6"
            >
              <option value="newest">Neueste</option>
              <option value="oldest">Älteste</option>
              <option value="alphabetical">A–Z</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors"
          >
            <Plus className="w-3 h-3" />
            Neu
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-zinc-600 text-xs">Keine Dokumente gefunden</p>
              <button
                onClick={openCreate}
                className="mt-3 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                Erstellen
              </button>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left px-3 py-2.5 transition-colors group ${
                    selectedDoc?.id === doc.id
                      ? "bg-[#252525]"
                      : "hover:bg-[#1e1e1e]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate leading-tight font-medium">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] rounded border font-medium ${getTypeColor(doc.type)}`}
                        >
                          {doc.type}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {formatBytes(doc.content)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-zinc-700" />
            </div>
            <p className="text-zinc-400 text-base font-medium mb-1">Dokument auswählen →</p>
            <p className="text-zinc-600 text-sm">
              Wähle ein Dokument aus der Liste links aus
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Doc Header */}
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#2a2a2a] px-8 py-5 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white leading-tight mb-2">
                    {selectedDoc.title}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${getTypeColor(selectedDoc.type)}`}>
                      {selectedDoc.type}
                    </span>
                    <span>·</span>
                    <span>{formatBytes(selectedDoc.content)}</span>
                    {getProjectName(selectedDoc) && (
                      <>
                        <span>·</span>
                        <span>Projekt: {getProjectName(selectedDoc)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>v1</span>
                    <span>·</span>
                    <span>Erstellt: {formatDate(selectedDoc.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(selectedDoc)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors border border-[#2a2a2a]"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(selectedDoc.id)}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-[#2a2a2a]"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>

            {/* Doc Content */}
            <div className="px-8 py-6 max-w-3xl">
              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── EDIT/CREATE MODAL ─── */}
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
    </div>
  );
}
