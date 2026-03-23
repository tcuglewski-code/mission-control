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
} from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  category: "nav" | "task" | "project";
}

const NAV_ITEMS: CommandItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Übersicht & Statistiken",
    icon: <LayoutDashboard className="w-4 h-4" />,
    href: "/dashboard",
    category: "nav",
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Kanban Board",
    icon: <CheckSquare className="w-4 h-4" />,
    href: "/tasks",
    category: "nav",
  },
  {
    id: "projects",
    label: "Projekte",
    description: "Alle Projekte",
    icon: <FolderKanban className="w-4 h-4" />,
    href: "/projects",
    category: "nav",
  },
  {
    id: "sprints",
    label: "Sprints",
    description: "Sprint-Planung",
    icon: <Zap className="w-4 h-4" />,
    href: "/sprints",
    category: "nav",
  },
  {
    id: "team",
    label: "Team",
    description: "Team & Agenten",
    icon: <Users className="w-4 h-4" />,
    href: "/team",
    category: "nav",
  },
  {
    id: "tickets",
    label: "Tickets",
    description: "Support & Issues",
    icon: <Ticket className="w-4 h-4" />,
    href: "/tickets",
    category: "nav",
  },
  {
    id: "docs",
    label: "Docs",
    description: "Dokumentation",
    icon: <FileText className="w-4 h-4" />,
    href: "/docs",
    category: "nav",
  },
  {
    id: "calendar",
    label: "Kalender",
    description: "Events & Termine",
    icon: <Calendar className="w-4 h-4" />,
    href: "/calendar",
    category: "nav",
  },
  {
    id: "cronjobs",
    label: "Cronjobs",
    description: "Automatisierungen",
    icon: <Clock className="w-4 h-4" />,
    href: "/cronjobs",
    category: "nav",
  },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Load dynamic items (tasks + projects) when query changes
  const fetchDynamic = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setDynamicItems([]);
      return;
    }
    setLoadingDynamic(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?limit=5`),
        fetch(`/api/projects`),
      ]);

      const newItems: CommandItem[] = [];

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const tasks: Array<{ id: string; title: string; status: string }> =
          Array.isArray(data) ? data : data.tasks ?? [];
        tasks
          .filter((t) => t.title.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .forEach((t) => {
            newItems.push({
              id: `task-${t.id}`,
              label: t.title,
              description: `Task · ${t.status}`,
              icon: <Hash className="w-4 h-4" />,
              href: `/tasks`,
              category: "task",
            });
          });
      }

      if (projectsRes.ok) {
        const projects: Array<{ id: string; name: string; status: string }> =
          await projectsRes.json();
        (Array.isArray(projects) ? projects : [])
          .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .forEach((p) => {
            newItems.push({
              id: `project-${p.id}`,
              label: p.name,
              description: `Projekt · ${p.status}`,
              icon: <FolderKanban className="w-4 h-4" />,
              href: `/projects/${p.id}`,
              category: "project",
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

  const filteredNav = NAV_ITEMS.filter(
    (item) =>
      !query ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...filteredNav, ...dynamicItems];

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && allItems[activeIndex]) {
        e.preventDefault();
        navigate(allItems[activeIndex]);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, allItems, activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const navigate = (item: CommandItem) => {
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  const CATEGORY_LABELS: Record<string, string> = {
    nav: "Navigation",
    task: "Tasks",
    project: "Projekte",
  };

  // Group items by category for display
  const navItems = allItems.filter((i) => i.category === "nav");
  const taskItems = allItems.filter((i) => i.category === "task");
  const projectItems = allItems.filter((i) => i.category === "project");

  const groups: Array<{ label: string; items: CommandItem[] }> = [];
  if (navItems.length) groups.push({ label: "Navigation", items: navItems });
  if (taskItems.length) groups.push({ label: "Tasks", items: taskItems });
  if (projectItems.length) groups.push({ label: "Projekte", items: projectItems });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl z-50 px-4">
        <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Suchen oder navigieren..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
            />
            {loadingDynamic && (
              <span className="text-[10px] text-zinc-600 animate-pulse">laden...</span>
            )}
            <kbd className="text-[10px] text-zinc-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {allItems.length === 0 && !loadingDynamic ? (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                Keine Ergebnisse für &ldquo;{query}&rdquo;
              </p>
            ) : (
              groups.map((group) => {
                return (
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
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            isActive
                              ? "bg-[#2a2a2a] text-white"
                              : "text-zinc-400 hover:bg-[#1e1e1e] hover:text-white"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="block text-xs text-zinc-500 truncate">
                                {item.description}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2a2a2a] text-[10px] text-zinc-600">
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">↑↓</kbd>navigieren
            </span>
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">↵</kbd>öffnen
            </span>
            <span>
              <kbd className="bg-[#2a2a2a] px-1 py-0.5 rounded mr-1">ESC</kbd>schließen
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
