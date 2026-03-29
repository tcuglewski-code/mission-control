"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Zap,
  Users,
  Ticket,
  FileText,
  Calendar,
  Clock,
  Search,
  ArrowRight,
  Hash,
  Milestone,
  History,
  X,
  Plus,
  Settings,
  Banknote,
  BarChart2,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

// ─── Typen ───────────────────────────────────────────────────────────────────

type CommandCategory = "navigieren" | "tasks" | "projekte" | "einstellungen";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  category: CommandCategory;
  action?: () => void;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const RECENT_COMMANDS_KEY = "mc_recent_commands";
const RECENT_SEARCHES_KEY = "mc_recent_searches";
const MAX_RECENT_COMMANDS = 5;
const MAX_RECENT_SEARCHES = 5;

const NAV_ITEMS: CommandItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Übersicht & Statistiken",
    icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />,
    href: "/dashboard",
    category: "navigieren",
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Kanban Board",
    icon: <CheckSquare className="w-4 h-4" aria-hidden="true" />,
    href: "/tasks",
    category: "navigieren",
  },
  {
    id: "projects",
    label: "Projekte",
    description: "Alle Projekte",
    icon: <FolderKanban className="w-4 h-4" aria-hidden="true" />,
    href: "/projects",
    category: "navigieren",
  },
  {
    id: "finance",
    label: "Finanzen",
    description: "Rechnungen & Zahlungen",
    icon: <Banknote className="w-4 h-4" aria-hidden="true" />,
    href: "/finance",
    category: "navigieren",
  },
  {
    id: "sprints",
    label: "Sprints",
    description: "Sprint-Planung",
    icon: <Zap className="w-4 h-4" aria-hidden="true" />,
    href: "/sprints",
    category: "navigieren",
  },
  {
    id: "team",
    label: "Team",
    description: "Team & Agenten",
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    href: "/team",
    category: "navigieren",
  },
  {
    id: "tickets",
    label: "Tickets",
    description: "Support & Issues",
    icon: <Ticket className="w-4 h-4" aria-hidden="true" />,
    href: "/tickets",
    category: "navigieren",
  },
  {
    id: "docs",
    label: "Docs",
    description: "Dokumentation",
    icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    href: "/docs",
    category: "navigieren",
  },
  {
    id: "calendar",
    label: "Kalender",
    description: "Events & Termine",
    icon: <Calendar className="w-4 h-4" aria-hidden="true" />,
    href: "/calendar",
    category: "navigieren",
  },
  {
    id: "cronjobs",
    label: "Cronjobs",
    description: "Automatisierungen",
    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
    href: "/cronjobs",
    category: "navigieren",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Auswertungen & Reports",
    icon: <BarChart2 className="w-4 h-4" aria-hidden="true" />,
    href: "/analytics",
    category: "navigieren",
  },
];

const SETTINGS_ITEMS: CommandItem[] = [
  {
    id: "settings-profile",
    label: "Mein Profil",
    description: "Profil & Account-Einstellungen",
    icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    href: "/settings/profile",
    category: "einstellungen",
  },
  {
    id: "settings-permissions",
    label: "Berechtigungen",
    description: "Rollen & Zugriffsrechte",
    icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    href: "/settings/permissions",
    category: "einstellungen",
  },
];

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigieren: "Navigieren",
  tasks: "Tasks",
  projekte: "Projekte",
  einstellungen: "Einstellungen",
};

// ─── Recent Commands / Searches Helpers ──────────────────────────────────────

interface RecentCommandEntry {
  id: string;
  label: string;
  href?: string;
  timestamp: number;
}

function loadRecentCommands(): RecentCommandEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(item: CommandItem) {
  if (!item.href) return;
  const existing = loadRecentCommands();
  const entry: RecentCommandEntry = {
    id: item.id,
    label: item.label,
    href: item.href,
    timestamp: Date.now(),
  };
  const updated = [entry, ...existing.filter((c) => c.id !== item.id)].slice(
    0,
    MAX_RECENT_COMMANDS
  );
  localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
}

function clearRecentCommands() {
  localStorage.removeItem(RECENT_COMMANDS_KEY);
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const existing = loadRecentSearches();
  const updated = [query, ...existing.filter((q) => q !== query)].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

// ─── Fokus-Trap ───────────────────────────────────────────────────────────────

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled"));
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentCommands, setRecentCommands] = useState<RecentCommandEntry[]>([]);
  // Task direkt erstellen via n "..."
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Fokus bei Öffnen + Daten laden ──
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setDynamicItems([]);
      setCreateError(null);
      setRecentSearches(loadRecentSearches());
      setRecentCommands(loadRecentCommands());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Keyboard-Trap: Tab bleibt im Modal ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = modalRef.current;
      if (!container) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Sonderkommandos auswerten ──
  // n "Task Name" → Task direkt erstellen
  // p Projektname → zu Projekt navigieren
  const specialCommand = useCallback(
    async (q: string): Promise<boolean> => {
      const trimmed = q.trim();

      // n "Task-Name" oder n 'Task-Name'
      const taskCreateMatch = trimmed.match(/^n\s+["'](.+?)["']\s*$/i);
      if (taskCreateMatch) {
        const title = taskCreateMatch[1].trim();
        if (!title) return false;
        setCreatingTask(true);
        setCreateError(null);
        try {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, status: "TODO" }),
          });
          if (res.ok) {
            setOpen(false);
            router.push("/tasks");
          } else {
            const data = await res.json().catch(() => ({}));
            setCreateError(data.error ?? "Task konnte nicht erstellt werden.");
          }
        } catch {
          setCreateError("Netzwerkfehler. Bitte erneut versuchen.");
        } finally {
          setCreatingTask(false);
        }
        return true;
      }

      // p Projektname → Suche nach Projekt und navigate
      const projectNavMatch = trimmed.match(/^p\s+(.+)$/i);
      if (projectNavMatch) {
        const name = projectNavMatch[1].trim().toLowerCase();
        // Suche in dynamicItems nach Projekt
        const found = dynamicItems.find(
          (item) => item.category === "projekte" && item.label.toLowerCase().startsWith(name)
        );
        if (found?.href) {
          setOpen(false);
          router.push(found.href);
          return true;
        }
        // Wenn kein dynamischer Treffer, zur Projektliste
        setOpen(false);
        router.push("/projects");
        return true;
      }

      return false;
    },
    [dynamicItems, router, setOpen]
  );

  // ── Dynamische Daten laden ──
  const fetchDynamic = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setDynamicItems([]);
      return;
    }
    // Sonderkommandos: keine dynamischen Ergebnisse bei n/p prefix
    if (/^[np]\s/i.test(q)) {
      setDynamicItems([]);
      return;
    }
    setLoadingDynamic(true);
    try {
      const [tasksRes, projectsRes, milestonesRes] = await Promise.all([
        fetch(`/api/tasks?limit=100`),
        fetch(`/api/projects`),
        fetch(`/api/milestones`),
      ]);

      const newItems: CommandItem[] = [];
      const qLow = q.toLowerCase();

      // Tasks — Volltext-Suche
      if (q.length >= 2) {
        try {
          const searchRes = await fetch(`/api/tasks/search?q=${encodeURIComponent(q)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const searchResults: Array<{
              id: string;
              title: string;
              status: string;
              descPreview?: string | null;
              commentPreview?: string | null;
              matchType: string;
              project?: { name: string; color: string } | null;
            }> = searchData.results ?? [];

            searchResults.slice(0, 6).forEach((t) => {
              const previewText = t.descPreview
                ? `${t.descPreview.slice(0, 60)}${t.descPreview.length > 60 ? "…" : ""}`
                : t.commentPreview
                ? `Kommentar: ${t.commentPreview.slice(0, 50)}…`
                : `Task · ${t.status}`;

              newItems.push({
                id: `task-${t.id}`,
                label: t.title,
                description: previewText,
                icon: <Hash className="w-4 h-4" aria-hidden="true" />,
                href: `/tasks`,
                category: "tasks",
              });
            });
          }
        } catch {
          if (tasksRes.ok) {
            const data = await tasksRes.json();
            const tasks: Array<{ id: string; title: string; status: string }> =
              Array.isArray(data) ? data : data.tasks ?? [];
            tasks
              .filter((t) => t.title.toLowerCase().includes(qLow))
              .slice(0, 5)
              .forEach((t) => {
                newItems.push({
                  id: `task-${t.id}`,
                  label: t.title,
                  description: `Task · ${t.status}`,
                  icon: <Hash className="w-4 h-4" aria-hidden="true" />,
                  href: `/tasks`,
                  category: "tasks",
                });
              });
          }
        }
      }

      // Projekte
      if (projectsRes.ok) {
        const projects: Array<{ id: string; name: string; status: string }> =
          await projectsRes.json();
        (Array.isArray(projects) ? projects : [])
          .filter((p) => p.name.toLowerCase().includes(qLow))
          .slice(0, 5)
          .forEach((p) => {
            newItems.push({
              id: `project-${p.id}`,
              label: p.name,
              description: `Projekt · ${p.status}`,
              icon: <FolderKanban className="w-4 h-4" aria-hidden="true" />,
              href: `/projects/${p.id}`,
              category: "projekte",
            });
          });
      }

      // Meilensteine
      if (milestonesRes.ok) {
        const milestones: Array<{ id: string; title: string; status: string; projectId: string }> =
          await milestonesRes.json();
        (Array.isArray(milestones) ? milestones : [])
          .filter((m) => m.title.toLowerCase().includes(qLow))
          .slice(0, 5)
          .forEach((m) => {
            newItems.push({
              id: `milestone-${m.id}`,
              label: m.title,
              description: `Meilenstein · ${m.status}`,
              icon: <Milestone className="w-4 h-4" aria-hidden="true" />,
              href: `/projects/${m.projectId}`,
              category: "projekte",
            });
          });
      }

      setDynamicItems(newItems);
    } catch (e) {
      console.error("CommandPalette fetch error", e);
    } finally {
      setLoadingDynamic(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchDynamic(query), 300);
    return () => clearTimeout(timeout);
  }, [query, fetchDynamic]);

  // ── Nav-Items filtern ──
  const filteredNav = NAV_ITEMS.filter(
    (item) =>
      !query ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const filteredSettings = SETTINGS_ITEMS.filter(
    (item) =>
      !query ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...filteredNav, ...dynamicItems, ...filteredSettings];

  // ── Tastatur-Navigation ──
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Sonderkommando prüfen
        if (/^[np]\s/i.test(query) || /^n\s+["']/.test(query)) {
          specialCommand(query);
        } else if (allItems[activeIndex]) {
          navigate(allItems[activeIndex]);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, allItems, activeIndex, query]);

  // ── Reset activeIndex bei neuen Ergebnissen ──
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Navigation ausführen + Recent speichern ──
  const navigate = (item: CommandItem) => {
    if (query.trim().length >= 2) {
      saveRecentSearch(query.trim());
    }
    saveRecentCommand(item);
    setOpen(false);
    if (item.href) router.push(item.href);
    else item.action?.();
  };

  const applyRecentSearch = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  if (!open) return null;

  // ── Sonderkommando-Hints ──────────────────────────────────────────────────
  const isTaskCreateCmd = /^n\s+["']?/i.test(query);
  const isProjectNavCmd = /^p\s+/i.test(query);
  const taskCreateTitle = query.match(/^n\s+["']?(.+?)["']?\s*$/i)?.[1] ?? "";
  const projectNavName = query.match(/^p\s+(.+)$/i)?.[1] ?? "";

  // ── Gruppen aufbauen ──────────────────────────────────────────────────────
  const navItems = allItems.filter((i) => i.category === "navigieren");
  const taskItems = allItems.filter((i) => i.category === "tasks");
  const projectItems = allItems.filter((i) => i.category === "projekte");
  const settingsItems = allItems.filter((i) => i.category === "einstellungen");

  const groups: Array<{ label: string; items: CommandItem[] }> = [];
  if (navItems.length) groups.push({ label: CATEGORY_LABELS.navigieren, items: navItems });
  if (taskItems.length) groups.push({ label: CATEGORY_LABELS.tasks, items: taskItems });
  if (projectItems.length) groups.push({ label: CATEGORY_LABELS.projekte, items: projectItems });
  if (settingsItems.length) groups.push({ label: CATEGORY_LABELS.einstellungen, items: settingsItems });

  // Zuletzt verwendete Befehle (nur im leeren Zustand)
  const showRecentCommands = !query && recentCommands.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        aria-label="Befehlspalette"
        className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl z-50 px-4"
      >
        <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl shadow-2xl overflow-hidden">
          {/* Sucheingabe */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              id="command-palette-title"
              type="text"
              role="combobox"
              aria-expanded={allItems.length > 0}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              placeholder='Suchen oder: n "Task Name" · p Projekt...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
            />
            {loadingDynamic && (
              <span className="text-[10px] text-zinc-600 animate-pulse" aria-live="polite">
                laden...
              </span>
            )}
            {creatingTask && (
              <span className="text-[10px] text-emerald-500 animate-pulse" aria-live="polite">
                erstelle Task...
              </span>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Befehlspalette schließen"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <kbd className="text-[10px] text-zinc-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Fehleranzeige */}
          {createError && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20" role="alert">
              <p className="text-xs text-red-400">{createError}</p>
            </div>
          )}

          {/* Sonderkommando-Hints */}
          {isTaskCreateCmd && taskCreateTitle && (
            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <p className="text-xs text-emerald-400">
                  Task erstellen:{" "}
                  <span className="font-semibold text-emerald-300">&ldquo;{taskCreateTitle}&rdquo;</span>
                  {" "}— Enter zum Bestätigen
                </p>
              </div>
            </div>
          )}
          {isProjectNavCmd && projectNavName && (
            <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                <p className="text-xs text-blue-400">
                  Zu Projekt navigieren:{" "}
                  <span className="font-semibold text-blue-300">{projectNavName}</span>
                  {" "}— Enter zum Bestätigen
                </p>
              </div>
            </div>
          )}

          {/* Inhaltsbereich */}
          <div className="max-h-80 overflow-y-auto py-2" role="listbox" aria-label="Befehle">
            {/* Zuletzt verwendete Befehle */}
            {showRecentCommands && (
              <div>
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3 h-3" aria-hidden="true" /> Zuletzt verwendet
                  </p>
                  <button
                    onClick={() => {
                      clearRecentCommands();
                      setRecentCommands([]);
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
                    aria-label="Zuletzt verwendete Befehle löschen"
                  >
                    Löschen
                  </button>
                </div>
                {recentCommands.map((cmd) => (
                  <button
                    key={`recent-${cmd.id}`}
                    onClick={() => {
                      if (cmd.href) {
                        setOpen(false);
                        router.push(cmd.href);
                      }
                    }}
                    role="option"
                    aria-selected={false}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-zinc-400 hover:bg-[#1e1e1e] hover:text-white transition-colors focus-visible:outline-none focus-visible:bg-[#2a2a2a] focus-visible:text-white"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm truncate">{cmd.label}</span>
                  </button>
                ))}
                <div className="h-px bg-[#2a2a2a] my-1 mx-4" />
              </div>
            )}

            {/* Letzte Suchen (nur wenn kein Query und keine Recent Commands) */}
            {!query && !showRecentCommands && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3 h-3" aria-hidden="true" /> Zuletzt gesucht
                  </p>
                  <button
                    onClick={() => {
                      clearRecentCommands();
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
                    aria-label="Letzte Suchen löschen"
                  >
                    Löschen
                  </button>
                </div>
                {recentSearches.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => applyRecentSearch(q)}
                    role="option"
                    aria-selected={false}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-zinc-400 hover:bg-[#1e1e1e] hover:text-white transition-colors focus-visible:outline-none focus-visible:bg-[#2a2a2a] focus-visible:text-white"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm truncate">{q}</span>
                  </button>
                ))}
                <div className="h-px bg-[#2a2a2a] my-1 mx-4" />
              </div>
            )}

            {/* Ergebnisse */}
            {allItems.length === 0 && !loadingDynamic && query && !isTaskCreateCmd && !isProjectNavCmd ? (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center" role="status">
                Keine Ergebnisse für &ldquo;{query}&rdquo;
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const globalIndex = allItems.indexOf(item);
                    const isActive = globalIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        role="option"
                        aria-selected={isActive}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none ${
                          isActive
                            ? "bg-[#2a2a2a] text-white"
                            : "text-zinc-400 hover:bg-[#1e1e1e] hover:text-white focus-visible:bg-[#2a2a2a] focus-visible:text-white"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{item.label}</span>
                          {item.description && (
                            <span className="block text-xs text-zinc-500 truncate">
                              {item.description}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            {/* Leerzustand */}
            {!query && !showRecentCommands && recentSearches.length === 0 && allItems.length > 0 && (
              <p className="px-4 py-2 text-[10px] text-zinc-600">
                Tippe um zu suchen — Tasks, Projekte, Meilensteine
              </p>
            )}
          </div>

          {/* Fußzeile */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2a2a2a] text-[10px] text-zinc-600 flex-wrap">
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">↑↓</kbd>navigieren
            </span>
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">↵</kbd>öffnen
            </span>
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">ESC</kbd>schließen
            </span>
            <span className="ml-auto opacity-60">
              n &quot;Name&quot; = Task · p Name = Projekt
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
