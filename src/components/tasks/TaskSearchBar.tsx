"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, History, X, Hash, FolderKanban, MessageSquare } from "lucide-react";

const SEARCH_HISTORY_KEY = "mc_task_search_history";
const MAX_HISTORY = 5;

export interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; name: string } | null;
  descPreview?: string | null;
  commentPreview?: string | null;
  matchType: "title" | "description" | "comment";
}

interface TaskSearchBarProps {
  onSelectTask?: (task: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(query: string) {
  if (!query.trim() || query.trim().length < 2) return;
  const existing = loadHistory();
  const updated = [query.trim(), ...existing.filter((q) => q !== query.trim())].slice(0, MAX_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

function clearHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Bearbeitung",
  in_review: "In Prüfung",
  done: "Erledigt",
};

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-orange-500",
  in_review: "bg-blue-500",
  backlog: "bg-zinc-600",
  todo: "bg-zinc-500",
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  title: "Titel",
  description: "Beschreibung",
  comment: "Kommentar",
};

export function TaskSearchBar({ onSelectTask, placeholder, className }: TaskSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Suchhistorie laden wenn Dropdown öffnet
  useEffect(() => {
    if (open) {
      setHistory(loadHistory());
    }
  }, [open]);

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Suche mit Debounce
  const fetchResults = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchResults(query), 350);
    return () => clearTimeout(timeout);
  }, [query, fetchResults]);

  const handleSelect = (task: SearchResult) => {
    saveToHistory(query);
    setHistory(loadHistory());
    setQuery("");
    setOpen(false);
    onSelectTask?.(task);
  };

  const applyHistoryItem = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const showHistory = !query && history.length > 0;
  const showResults = query.trim().length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Tasks durchsuchen (Titel, Beschreibung, Kommentare)..."}
          className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {loading && !query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (showHistory || showResults) && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Suchhistorie (nur wenn kein Query) */}
          {showHistory && (
            <div>
              <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3" /> Letzte Suchen
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors"
                >
                  Löschen
                </button>
              </div>
              {history.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyHistoryItem(q)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-[#252525] transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span className="text-sm text-zinc-400">{q}</span>
                </button>
              ))}
              <div className="h-px bg-[#2a2a2a] my-1 mx-4" />
            </div>
          )}

          {/* Suchergebnisse */}
          {showResults && (
            <>
              {loading ? (
                <div className="px-4 py-3 text-xs text-zinc-500 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-transparent animate-spin" />
                  Suche läuft...
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500 text-center">
                  Keine Ergebnisse für &ldquo;{query}&rdquo;
                </div>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                      {results.length} Ergebnis{results.length !== 1 ? "se" : ""}
                    </span>
                  </div>
                  {results.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleSelect(task)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[#252525] transition-colors group"
                    >
                      {/* Status-Dot */}
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${STATUS_COLORS[task.status] ?? "bg-zinc-600"}`}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Titel + Match-Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-medium truncate">{task.title}</span>
                          <span className="text-[9px] text-zinc-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded shrink-0">
                            {MATCH_TYPE_LABELS[task.matchType]}
                          </span>
                        </div>

                        {/* Beschreibungs-Vorschau */}
                        {task.descPreview && task.matchType !== "comment" && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                            <Hash className="w-2.5 h-2.5 shrink-0" />
                            {task.descPreview}
                          </p>
                        )}

                        {/* Kommentar-Vorschau */}
                        {task.commentPreview && task.matchType === "comment" && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            {task.commentPreview}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-zinc-600">
                            {STATUS_LABELS[task.status] ?? task.status}
                          </span>
                          {task.project && (
                            <span
                              className="text-[10px] flex items-center gap-0.5"
                              style={{ color: task.project.color }}
                            >
                              <FolderKanban className="w-2.5 h-2.5" />
                              {task.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
