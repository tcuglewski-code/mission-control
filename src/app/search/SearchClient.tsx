"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, History, CheckSquare, FolderKanban, FileText,
  Receipt, MessageSquare, Clock, Bookmark, BookmarkPlus,
  ChevronDown, ChevronUp, Trash2, Filter, Star,
  CheckSquare2, AlertCircle, RotateCcw,
} from "lucide-react";
import { parseSmartFilter, filterToChips, type ParsedFilter } from "@/lib/smart-filter";
import { useSession } from "next-auth/react";

// ─── Typen ────────────────────────────────────────────────────────────────────

type ResultType = "task" | "project" | "document" | "invoice" | "comment";

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  url: string;
  status?: string;
  priority?: string;
  project?: { id: string; name: string; color: string } | null;
}

interface SavedView {
  id: string;
  name: string;
  filterRaw: string;
  icon?: string;
}

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

const HISTORY_KEY = "mc_search_history_fz";
const RECENT_KEY = "mc_recent_visits_fz";
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function saveToHistory(q: string) {
  if (!q.trim() || q.length < 2) return;
  const prev = loadHistory();
  const next = [q.trim(), ...prev.filter((x) => x !== q.trim())].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}
function clearHistory() { localStorage.removeItem(HISTORY_KEY); }

function loadRecentVisits(): Array<{ id: string; title: string; type: ResultType; url: string }> {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function addRecentVisit(item: { id: string; title: string; type: ResultType; url: string }) {
  const prev = loadRecentVisits();
  const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ResultType, React.ReactNode> = {
  task: <CheckSquare className="w-4 h-4 text-blue-400" />,
  project: <FolderKanban className="w-4 h-4 text-emerald-400" />,
  document: <FileText className="w-4 h-4 text-yellow-400" />,
  invoice: <Receipt className="w-4 h-4 text-purple-400" />,
  comment: <MessageSquare className="w-4 h-4 text-zinc-400" />,
};

const TYPE_LABELS: Record<ResultType, string> = {
  task: "Task", project: "Projekt", document: "Dokument",
  invoice: "Rechnung", comment: "Kommentar",
};

const TYPE_COLORS: Record<ResultType, string> = {
  task: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  project: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  document: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  invoice: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  comment: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
};

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500", in_progress: "bg-orange-500",
  in_review: "bg-blue-500", backlog: "bg-zinc-600",
  todo: "bg-zinc-500", blocked: "bg-red-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400", high: "text-orange-400",
  medium: "text-yellow-400", low: "text-zinc-500",
};

const DEFAULT_VIEWS: SavedView[] = [
  { id: "__meine-tasks", name: "Meine Tasks", filterRaw: "assignee:ich status:offen", icon: "👤" },
  { id: "__diese-woche", name: "Diese Woche fällig", filterRaw: "due:diese-woche", icon: "📅" },
  { id: "__blockiert", name: "Blockiert", filterRaw: "filter:blocked", icon: "🚫" },
];

const FILTER_SUGGESTIONS = [
  { label: "Mir zugewiesen", token: "assignee:ich" },
  { label: "Offen", token: "status:offen" },
  { label: "Hohe Priorität", token: "prio:hoch" },
  { label: "Heute fällig", token: "due:heute" },
  { label: "Diese Woche", token: "due:diese-woche" },
  { label: "In Bearbeitung", token: "status:in_progress" },
  { label: "Blockiert", token: "filter:blocked" },
  { label: "Erledigt", token: "status:erledigt" },
];

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [recentVisits, setRecentVisits] = useState<ReturnType<typeof loadRecentVisits>>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"status" | "assignee" | "label" | "delete" | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ParsedFilter | null>(null);
  const [filterType, setFilterType] = useState<ResultType | "all">("all");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  // Abgeleitete Werte
  const parsedFilter = query ? parseSmartFilter(query) : null;
  const chips = parsedFilter ? filterToChips(parsedFilter) : [];
  const taskResults = results.filter((r) => r.type === "task" || r.type === "comment");
  const filteredResults = filterType === "all" ? results : results.filter((r) => r.type === filterType);

  // Init
  useEffect(() => {
    setHistory(loadHistory());
    setRecentVisits(loadRecentVisits());
    fetch("/api/saved-views").then((r) => r.ok ? r.json() : []).then(setSavedViews).catch(() => {});
    fetch("/api/team").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setUsers(data.map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
    // URL-Query übernehmen (z.B. von Sidebar-Links)
    const urlQ = searchParams.get("q");
    if (urlQ) setQuery(urlQ);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suche mit Debounce
  const fetchResults = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchResults(query), 350);
    return () => clearTimeout(timeout);
  }, [query, fetchResults]);

  // Keyboard-Navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!query || filteredResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleResultClick(filteredResults[activeIndex]);
      } else if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, filteredResults, activeIndex]);

  // Focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleResultClick(r: SearchResult) {
    saveToHistory(query);
    setHistory(loadHistory());
    addRecentVisit({ id: r.id, title: r.title, type: r.type, url: r.url });
    setRecentVisits(loadRecentVisits());
    router.push(r.url);
  }

  function applyHistoryItem(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  function applyView(view: SavedView) {
    setQuery(view.filterRaw);
    inputRef.current?.focus();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === taskResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(taskResults.map((r) => r.id)));
    }
  }

  async function executeBulk() {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: bulkAction,
          value: bulkValue || undefined,
        }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setBulkAction(null);
        setBulkValue("");
        await fetchResults(query);
      }
    } catch { /* ignore */ } finally { setBulkLoading(false); }
  }

  async function saveView() {
    if (!saveViewName.trim() || !query.trim()) return;
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveViewName.trim(), filterRaw: query.trim() }),
      });
      if (res.ok) {
        const view = await res.json();
        setSavedViews((prev) => [...prev, view]);
        setSaveViewName("");
        setShowSaveForm(false);
      }
    } catch { /* ignore */ }
  }

  async function deleteView(id: string) {
    if (id.startsWith("__")) return; // Default-Views nicht löschbar
    await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  }

  function addToken(token: string) {
    setQuery((q) => {
      const trimmed = q.trim();
      return trimmed ? `${trimmed} ${token}` : token;
    });
    inputRef.current?.focus();
  }

  const allViews = [...DEFAULT_VIEWS, ...savedViews];
  const hasQuery = query.trim().length >= 2;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Search className="w-6 h-6 text-emerald-400" /> Erweiterte Suche
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Durchsuche Tasks, Projekte, Dokumente und Rechnungen
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar: Gespeicherte Ansichten ─────────────── */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" /> Gespeicherte Ansichten
                </h2>
                {query.trim().length >= 2 && (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="text-emerald-500 hover:text-emerald-400 transition-colors"
                    title="Aktuelle Suche speichern"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Speichern-Formular */}
              {showSaveForm && (
                <div className="mb-3 flex gap-1.5">
                  <input
                    type="text"
                    value={saveViewName}
                    onChange={(e) => setSaveViewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveView(); if (e.key === "Escape") setShowSaveForm(false); }}
                    placeholder="Name der Ansicht…"
                    autoFocus
                    className="flex-1 bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#3a3a3a] rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button onClick={saveView} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs transition-colors">
                    ✓
                  </button>
                  <button onClick={() => setShowSaveForm(false)} className="px-2 py-1 text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white transition-colors text-xs">
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {allViews.map((view) => (
                  <div key={view.id} className="flex items-center group">
                    <button
                      onClick={() => applyView(view)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors"
                    >
                      <span>{view.icon ?? "📌"}</span>
                      <span className="truncate">{view.name}</span>
                    </button>
                    {!view.id.startsWith("__") && (
                      <button
                        onClick={() => deleteView(view.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filter-Vorschläge */}
            <div className="bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Schnellfilter
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_SUGGESTIONS.map((s) => (
                  <button
                    key={s.token}
                    onClick={() => addToken(s.token)}
                    className="px-2 py-1 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2e2e2e] border border-gray-200 dark:border-[#3a3a3a] rounded-full text-xs text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors font-mono"
                  >
                    {s.token}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Haupt-Bereich ──────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Suchfeld */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); setSelectedIds(new Set()); }}
                placeholder="Suchen… oder Filter: assignee:ich status:offen prio:hoch due:heute"
                className="w-full bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#2a2a2a] rounded-xl pl-12 pr-12 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all shadow-sm"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setResults([]); setActiveIndex(-1); setSelectedIds(new Set()); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Filter-Chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400"
                  >
                    {chip.label}
                    <button
                      onClick={() => {
                        // Token aus Query entfernen
                        const re = new RegExp(`\\w+:["\\w-äöüÄÖÜß]+`, "g");
                        const filtered = query.replace(re, (m) => {
                          const [k] = m.split(":");
                          const keyMap: Record<string, string> = {
                            assignee: chip.key, zugewiesen: chip.key,
                            project: chip.key, projekt: chip.key,
                            status: chip.key, prio: chip.key, priority: chip.key,
                            due: chip.key, fällig: chip.key, filter: chip.key,
                          };
                          return keyMap[k.toLowerCase()] === chip.key ? "" : m;
                        }).trim().replace(/\s+/g, " ");
                        setQuery(filtered);
                      }}
                      className="text-emerald-400/60 hover:text-emerald-400 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => { setQuery(""); setResults([]); }}
                  className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Zurücksetzen
                </button>
              </div>
            )}

            {/* ── Kein Query: Verlauf + Zuletzt angesehen ─── */}
            {!hasQuery && (
              <div className="space-y-6">

                {/* Suchverlauf */}
                {history.length > 0 && (
                  <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Letzte Suchen
                      </h3>
                      <button
                        onClick={() => { clearHistory(); setHistory([]); }}
                        className="text-xs text-gray-400 dark:text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Alle löschen
                      </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                      {history.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => applyHistoryItem(q)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors group"
                        >
                          <History className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-zinc-300">{q}</span>
                          <Search className="w-3 h-3 text-gray-300 dark:text-zinc-700 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zuletzt angesehen */}
                {recentVisits.length > 0 && (
                  <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
                    <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Zuletzt angesehen
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                      {recentVisits.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => router.push(item.url)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
                        >
                          {TYPE_ICONS[item.type]}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white truncate">{item.title}</p>
                            <p className="text-xs text-gray-400 dark:text-zinc-600">{TYPE_LABELS[item.type]}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {history.length === 0 && recentVisits.length === 0 && (
                  <div className="text-center py-16 text-gray-400 dark:text-zinc-600">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Suche starten oder Filter wählen</p>
                    <p className="text-xs mt-1">z.B. <span className="font-mono text-emerald-500/70">assignee:ich status:offen</span></p>
                  </div>
                )}
              </div>
            )}

            {/* ── Ergebnisse ──────────────────────────────── */}
            {hasQuery && (
              <div className="space-y-4">

                {/* Ergebnis-Header + Typ-Filter */}
                {!loading && results.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                      <span className="font-medium text-gray-900 dark:text-white">{filteredResults.length}</span>{" "}
                      Ergebnis{filteredResults.length !== 1 ? "se" : ""}
                    </p>
                    <div className="flex gap-1">
                      {(["all", "task", "project", "document", "invoice"] as const).map((t) => {
                        const count = t === "all" ? results.length : results.filter((r) => r.type === t).length;
                        if (count === 0 && t !== "all") return null;
                        return (
                          <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                              filterType === t
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-[#2e2e2e]"
                            }`}
                          >
                            {t === "all" ? "Alle" : TYPE_LABELS[t]} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bulk-Aktionen Bar */}
                {selectedIds.size > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-emerald-400 font-medium">
                      {selectedIds.size} Task{selectedIds.size !== 1 ? "s" : ""} ausgewählt
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={bulkAction ?? ""}
                        onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
                        className="bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                      >
                        <option value="">Aktion wählen…</option>
                        <option value="status">Status ändern</option>
                        <option value="assignee">Zuweisen</option>
                        <option value="label">Label hinzufügen</option>
                        <option value="delete">Löschen</option>
                      </select>
                      {bulkAction === "status" && (
                        <select
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          className="bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="">Status wählen…</option>
                          <option value="todo">Offen</option>
                          <option value="in_progress">In Bearbeitung</option>
                          <option value="in_review">In Prüfung</option>
                          <option value="done">Erledigt</option>
                          <option value="backlog">Backlog</option>
                        </select>
                      )}
                      {bulkAction === "assignee" && (
                        <select
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          className="bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="">Niemand</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      )}
                      {bulkAction === "label" && (
                        <input
                          type="text"
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          placeholder="Label-Name…"
                          className="bg-white dark:bg-[#1c1c1c] border border-gray-300 dark:border-[#3a3a3a] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none"
                        />
                      )}
                      {bulkAction && (
                        <button
                          onClick={executeBulk}
                          disabled={bulkLoading || (bulkAction !== "delete" && !bulkValue)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            bulkAction === "delete"
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          } disabled:opacity-50`}
                        >
                          {bulkLoading ? "…" : bulkAction === "delete" ? "Löschen" : "Anwenden"}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="ml-auto text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Ergebnis-Liste */}
                {loading ? (
                  <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-8 flex items-center justify-center gap-3 text-gray-500 dark:text-zinc-500">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                    <span className="text-sm">Suche läuft…</span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-12 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                      Keine Ergebnisse für <strong className="text-gray-700 dark:text-zinc-300">&ldquo;{query}&rdquo;</strong>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Andere Schreibweise oder weniger Filter versuchen</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                    {/* Checkbox "Alle" (nur Tasks) */}
                    {taskResults.length > 0 && (
                      <div className="px-4 py-2 flex items-center gap-3 bg-gray-50 dark:bg-[#1c1c1c]">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === taskResults.length && taskResults.length > 0}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-[#3a3a3a] accent-emerald-500"
                        />
                        <span className="text-xs text-gray-500 dark:text-zinc-500">
                          Alle Tasks auswählen ({taskResults.length})
                        </span>
                      </div>
                    )}

                    {filteredResults.map((result, idx) => {
                      const isTask = result.type === "task" || result.type === "comment";
                      const isSelected = selectedIds.has(result.id);
                      const isActive = idx === activeIndex;

                      return (
                        <div
                          key={result.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors cursor-pointer group ${
                            isActive ? "bg-gray-50 dark:bg-[#1e1e1e]" : ""
                          } ${isSelected ? "bg-emerald-500/5" : ""}`}
                          onClick={() => handleResultClick(result)}
                        >
                          {/* Checkbox (nur Tasks) */}
                          {isTask && (
                            <div
                              className="mt-0.5 shrink-0"
                              onClick={(e) => { e.stopPropagation(); toggleSelect(result.id); }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(result.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-[#3a3a3a] accent-emerald-500"
                              />
                            </div>
                          )}

                          {/* Type-Icon */}
                          <div className="mt-0.5 shrink-0">{TYPE_ICONS[result.type]}</div>

                          {/* Inhalt */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${TYPE_COLORS[result.type]}`}>
                                {TYPE_LABELS[result.type]}
                              </span>
                              {result.status && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[result.status] ?? "bg-zinc-500"}`} />
                                  {result.status}
                                </span>
                              )}
                              {result.priority && (
                                <span className={`text-[10px] ${PRIORITY_COLORS[result.priority] ?? "text-zinc-500"}`}>
                                  ⚡ {result.priority}
                                </span>
                              )}
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 truncate">{result.subtitle}</p>
                            )}
                            {result.project && (
                              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: result.project.color }}>
                                <FolderKanban className="w-2.5 h-2.5" />
                                {result.project.name}
                              </p>
                            )}
                          </div>

                          {/* Arrow indicator on hover / active */}
                          <div className={`shrink-0 self-center transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 rotate-[-90deg]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tastatur-Hinweis */}
                {filteredResults.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-zinc-600 text-center flex items-center justify-center gap-3">
                    <span><kbd className="font-mono bg-gray-100 dark:bg-[#252525] px-1 rounded">↑↓</kbd> Navigieren</span>
                    <span><kbd className="font-mono bg-gray-100 dark:bg-[#252525] px-1 rounded">Enter</kbd> Öffnen</span>
                    <span><kbd className="font-mono bg-gray-100 dark:bg-[#252525] px-1 rounded">Esc</kbd> Zurücksetzen</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = "force-dynamic";
