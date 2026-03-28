"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Plus, Search, X, Trash2, ExternalLink, Download, Eye,
  FileText, FileSpreadsheet, Image as ImageIcon, Link as LinkIcon,
  File, Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface FileDocItem {
  id:            string;
  name:          string;
  description:   string | null;
  url:           string;
  fileType:      string;
  size:          number | null;
  uploader:      string;
  uploaderEmail: string | null;
  projectId:     string | null;
  project:       { id: string; name: string } | null;
  createdAt:     string;
  updatedAt:     string;
}

interface Props {
  initialDocs:  FileDocItem[];
  projects:     { id: string; name: string }[];
  uploaderName: string;
}

// ─── Konfig ───────────────────────────────────────────────────────────────────

const FILE_TYPES = [
  { value: "all",    label: "Alle Typen" },
  { value: "pdf",    label: "PDF" },
  { value: "word",   label: "Word" },
  { value: "excel",  label: "Excel" },
  { value: "image",  label: "Bild" },
  { value: "link",   label: "Link" },
  { value: "other",  label: "Sonstig" },
];

const TYPE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  pdf:   { label: "PDF",    icon: FileText,        color: "text-red-400" },
  word:  { label: "Word",   icon: FileText,        color: "text-blue-400" },
  excel: { label: "Excel",  icon: FileSpreadsheet, color: "text-emerald-400" },
  image: { label: "Bild",   icon: ImageIcon,       color: "text-purple-400" },
  link:  { label: "Link",   icon: LinkIcon,        color: "text-cyan-400" },
  other: { label: "Sonstig", icon: File,           color: "text-zinc-400" },
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function detectFileType(url: string, name: string): string {
  const lower = (url + name).toLowerCase();
  if (lower.match(/\.pdf($|\?)/))                               return "pdf";
  if (lower.match(/\.(docx?|odt)($|\?)/))                      return "word";
  if (lower.match(/\.(xlsx?|ods|csv)($|\?)/))                   return "excel";
  if (lower.match(/\.(png|jpe?g|gif|webp|svg|bmp)($|\?)/))     return "image";
  if (!url.match(/^https?:\/\/.+\//))                           return "link";
  return "link";
}

// ─── Vorschau-Modal ──────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }: { doc: FileDocItem; onClose: () => void }) {
  const cfg = TYPE_CONFIG[doc.fileType] ?? TYPE_CONFIG.other;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3 min-w-0">
            <cfg.icon className={cn("w-5 h-5 shrink-0", cfg.color)} />
            <h2 className="text-white font-semibold truncate">{doc.name}</h2>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", cfg.color, "bg-current/10 border-current/20")}>
              {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {doc.fileType === "image" ? (
            <div className="flex items-center justify-center h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.url} alt={doc.name} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            </div>
          ) : doc.fileType === "pdf" ? (
            <iframe
              src={doc.url}
              className="w-full h-[60vh] rounded-lg border border-[#2a2a2a]"
              title={doc.name}
            />
          ) : doc.fileType === "link" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <LinkIcon className="w-12 h-12 text-cyan-400" />
              <p className="text-zinc-400 text-sm text-center max-w-sm">Externer Link — wird in neuem Tab geöffnet</p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Link öffnen
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <cfg.icon className={cn("w-12 h-12", cfg.color)} />
              <p className="text-zinc-400 text-sm">Vorschau nicht verfügbar</p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                download={doc.name}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/30 rounded-lg text-zinc-300 text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Herunterladen
              </a>
            </div>
          )}
        </div>

        {/* Meta */}
        {doc.description && (
          <div className="px-5 py-3 border-t border-[#2a2a2a]">
            <p className="text-sm text-zinc-400">{doc.description}</p>
          </div>
        )}
        <div className="px-5 py-3 border-t border-[#2a2a2a] flex items-center gap-4 text-xs text-zinc-600">
          <span>Hochgeladen von <span className="text-zinc-400">{doc.uploader}</span></span>
          <span>•</span>
          <span>{formatDate(doc.createdAt)}</span>
          {doc.size && <><span>•</span><span>{formatBytes(doc.size)}</span></>}
          {doc.project && <><span>•</span><span className="text-zinc-400">{doc.project.name}</span></>}
        </div>
      </div>
    </div>
  );
}

// ─── Dokument hinzufügen Modal ────────────────────────────────────────────────

interface AddModalProps {
  projects: { id: string; name: string }[];
  uploaderName: string;
  defaultProjectId?: string;
  onClose: () => void;
  onSave: (doc: FileDocItem) => void;
}

function AddModal({ projects, uploaderName, defaultProjectId, onClose, onSave }: AddModalProps) {
  const [name,        setName]        = useState("");
  const [url,         setUrl]         = useState("");
  const [description, setDescription] = useState("");
  const [fileType,    setFileType]    = useState("link");
  const [projectId,   setProjectId]   = useState(defaultProjectId ?? "");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const urlRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (v: string) => {
    setUrl(v);
    if (!name) {
      try {
        const u = new URL(v);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length > 0) setName(decodeURIComponent(parts[parts.length - 1]));
      } catch {/* ok */}
    }
    const detected = detectFileType(v, name);
    setFileType(detected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError("Name und URL sind Pflichtfelder"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          url: url.trim(),
          fileType,
          projectId: projectId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler beim Speichern");
        return;
      }
      const doc = await res.json();
      onSave(doc);
      onClose();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold">Dokument hinzufügen</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* URL */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">URL / Link *</label>
            <input
              ref={urlRef}
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/dokument.pdf"
              required
              className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Projektplan Q1 2026"
              required
              className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optionale Beschreibung…"
              className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Typ + Projekt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Typ</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                {FILE_TYPES.filter((t) => t.value !== "all").map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Projekt (optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">— Kein Projekt —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-[#2a2a2a] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? "Speichern…" : "Hinzufügen"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Dokument-Zeile ──────────────────────────────────────────────────────────

function DocRow({
  doc,
  onPreview,
  onDelete,
}: {
  doc: FileDocItem;
  onPreview: (doc: FileDocItem) => void;
  onDelete:  (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const cfg = TYPE_CONFIG[doc.fileType] ?? TYPE_CONFIG.other;
  const Icon = cfg.icon;

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    onDelete(doc.id);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e1e1e] transition-colors group border-b border-[#2a2a2a] last:border-0">
      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-current/5", cfg.color)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-600">
          {doc.project && (
            <span className="text-zinc-500">{doc.project.name}</span>
          )}
          {doc.project && <span>•</span>}
          <span>{formatDate(doc.createdAt)}</span>
          <span>•</span>
          <span>{doc.uploader}</span>
          {doc.size && <><span>•</span><span>{formatBytes(doc.size)}</span></>}
        </div>
      </div>

      {/* Typ-Badge */}
      <span className={cn(
        "text-[11px] px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1",
        cfg.color, "border-current/20 bg-transparent"
      )}>
        {cfg.label}
      </span>

      {/* Aktionen */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Vorschau */}
        <button
          onClick={() => onPreview(doc)}
          title="Vorschau"
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Download / Link */}
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          download={doc.fileType !== "link" ? doc.name : undefined}
          title={doc.fileType === "link" ? "Link öffnen" : "Herunterladen"}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        >
          {doc.fileType === "link" ? (
            <ExternalLink className="w-3.5 h-3.5" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </a>

        {/* Löschen */}
        <button
          onClick={handleDelete}
          title={confirming ? "Wirklich löschen?" : "Löschen"}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            confirming
              ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
              : "text-zinc-400 hover:text-red-400 hover:bg-[#2a2a2a]"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function DocumentsClient({ initialDocs, projects, uploaderName }: Props) {
  const [docs,         setDocs]         = useState<FileDocItem[]>(initialDocs);
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [preview,      setPreview]      = useState<FileDocItem | null>(null);

  // Unique uploaders for filter
  const uploaders = useMemo(
    () => [...new Set(docs.map((d) => d.uploader))].sort(),
    [docs]
  );

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && d.fileType !== typeFilter) return false;
      if (uploaderFilter && d.uploader !== uploaderFilter) return false;
      if (dateFrom && new Date(d.createdAt) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(d.createdAt) > new Date(dateTo))   return false;
      return true;
    });
  }, [docs, search, typeFilter, uploaderFilter, dateFrom, dateTo]);

  const handleDelete = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleAdd = useCallback((doc: FileDocItem) => {
    setDocs((prev) => [doc, ...prev]);
  }, []);

  const activeFilterCount = [
    typeFilter !== "all", uploaderFilter, dateFrom, dateTo,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a] shrink-0 flex-wrap">
        {/* Suche */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Datei suchen…"
            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter-Toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
            showFilters || activeFilterCount > 0
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-[#161616] border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-[#3a3a3a]"
          )}
        >
          <Filter className="w-4 h-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="bg-emerald-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
        </button>

        {/* Hinzufügen */}
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Hinzufügen
        </button>
      </div>

      {/* Filter-Bar */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] bg-[#161616] flex-wrap shrink-0">
          {/* Typ */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            {FILE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Uploader */}
          <select
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Alle Uploader</option>
            {uploaders.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {/* Datum von */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Von</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Datum bis */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Bis</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setTypeFilter("all"); setUploaderFilter(""); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-zinc-500 hover:text-white underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <File className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-medium">Keine Dokumente gefunden</p>
            <p className="text-zinc-600 text-sm mt-1">
              {search || activeFilterCount > 0
                ? "Suchfilter anpassen oder zurücksetzen"
                : 'Über "Hinzufügen" Links und Dateien hinterlegen'}
            </p>
          </div>
        ) : (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl m-4 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-[#2a2a2a] text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
              <span>Name</span>
              <span className="hidden sm:block">Datum</span>
              <span className="hidden sm:block text-right pr-20">Typ</span>
            </div>
            {filtered.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onPreview={setPreview}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Zähler */}
      <div className="px-4 py-2 border-t border-[#2a2a2a] text-xs text-zinc-600 shrink-0">
        {filtered.length} von {docs.length} Dokument{docs.length !== 1 ? "en" : ""}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddModal
          projects={projects}
          uploaderName={uploaderName}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
      {preview && (
        <PreviewModal doc={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
