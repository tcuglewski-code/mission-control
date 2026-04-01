"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Timer,
  Clock,
  FolderKanban,
  Brain,
  FileText,
  FolderArchive,
  Users,
  Wrench,
  Zap,
  X,
  Database,
  Ticket,
  GitGraph,
  Webhook,
  ShieldCheck,
  LogOut,
  Flag,
  GanttChartSquare,
  Newspaper,
  BotIcon,
  ClipboardList,
  Keyboard,
  Moon,
  Sun,
  LayoutTemplate,
  Megaphone,
  UserCog,
  Settings,
  Banknote,
  Mail,
  BarChart2,
  ActivitySquare,
  Bell,
  Search,
  Bookmark,
  Trash2,
  Radio,
  Activity,
  BellRing,
  RefreshCw,
  Target,
  TrendingUp,
  NotebookPen,
} from "lucide-react";
import { useKeyboardShortcutsModal } from "@/hooks/useKeyboardShortcutsModal";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useThemeStore } from "@/store/useThemeStore";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/live", icon: Radio, label: "Live Dashboard" },
  { href: "/search", icon: Search, label: "Erweiterte Suche" },
  { href: "/my-day", icon: Sun, label: "Mein Tag" },
  { href: "/my-week", icon: CalendarDays, label: "Meine Woche" },
  { href: "/announcements", icon: Megaphone, label: "Ankündigungen" },
  { href: "/tasks", icon: CheckSquare, label: "Aufgaben" },
  { href: "/ice-ranking", icon: Target, label: "🎯 ICE Priorisierung" },
  { href: "/notifications", icon: Bell, label: "Benachrichtigungen" },
  { href: "/inbox", icon: Mail, label: "Posteingang" },
  { href: "/sprints", icon: Flag, label: "Sprints" },
  { href: "/timeline", icon: GanttChartSquare, label: "Timeline" },
  { href: "/digest", icon: Newspaper, label: "KI-Digest" },
  { href: "/calendar", icon: CalendarDays, label: "Kalender" },
  { href: "/time", icon: Clock, label: "Zeiterfassung" },
  { href: "/cronjobs", icon: Timer, label: "Cron Jobs" },
  { href: "/loop", icon: RefreshCw, label: "🔄 Auto-Loop" },
  { href: "/projects", icon: FolderKanban, label: "Projekte" },
  { href: "/sales", icon: Target, label: "Sales Pipeline" },
  { href: "/okr", icon: Target, label: "OKR Dashboard" },
  { href: "/meetings", icon: NotebookPen, label: "Meeting Notes" },
  { href: "/risks", icon: ShieldCheck, label: "⚠️ Risk Register" },
  { href: "/decisions", icon: FileText, label: "📋 Decisions Log" },
  { href: "/finance", icon: Banknote, label: "Finanzen" },
  { href: "/finance/cashflow", icon: TrendingUp, label: "💰 Cash Flow" },
  { href: "/quotes", icon: FileText, label: "Angebote" },
  { href: "/invoice-templates", icon: FileText, label: "Rechnungsvorlagen" },
  { href: "/activity", icon: ActivitySquare, label: "Aktivitäten" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/reports/weekly", icon: ClipboardList, label: "Team-Report" },
  { href: "/reports/export", icon: FileText, label: "CSV Export" },
  { href: "/memory", icon: Brain, label: "Memory" },
  { href: "/docs", icon: FileText, label: "Dokumente" },
  { href: "/documents", icon: FolderArchive, label: "Dateiverwaltung" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/team/activity", icon: ActivitySquare, label: "Team-Aktivität" },
  { href: "/tools", icon: Wrench, label: "Tools" },
  { href: "/estimator", icon: Zap, label: "📊 SP-Schätzer" },
  { href: "/ai-usage", icon: Brain, label: "💰 KI-Kosten" },
  { href: "/roi", icon: TrendingUp, label: "📈 ROI Dashboard" },
  { href: "/databases", icon: Database, label: "Datenbanken" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" },
  { href: "/agents", icon: BotIcon, label: "Agenten" },
  { href: "/diagram", icon: GitGraph, label: "Diagramm" },
  { href: "/templates", icon: LayoutTemplate, label: "Vorlagen" },
];

function ThemeToggleButton() {
  const { isDark, toggleTheme } = useThemeStore();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
      className="text-zinc-600 hover:text-amber-400 p-1 rounded transition-colors"
    >
      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}

interface TeamActivity {
  userName: string;
  action: string;
  entityName: string;
  createdAt: string;
}

function TeamNavItemWithTooltip({
  href,
  icon: Icon,
  label,
  isActive,
  onClose,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClose: () => void;
}) {
  const [tooltip, setTooltip] = useState<TeamActivity | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadActivity = async () => {
    if (tooltip) return; // bereits geladen
    try {
      const res = await fetch("/api/activity?limit=1");
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs ?? [];
        if (logs.length > 0) {
          const log = logs[0];
          setTooltip({
            userName: log.user?.name ?? "Unbekannt",
            action: log.action,
            entityName: log.entityName,
            createdAt: log.createdAt,
          });
        }
      }
    } catch {}
  };

  const handleMouseEnter = () => {
    loadActivity();
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  const actionLabels: Record<string, string> = {
    created: "erstellt",
    updated: "aktualisiert",
    deleted: "gelöscht",
    completed: "abgeschlossen",
    status_changed: "Status geändert",
    assigned: "zugewiesen",
    commented: "kommentiert",
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
          isActive
            ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
            : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r-full" />
        )}
        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-emerald-400" : "")} />
        <span>{label}</span>
      </Link>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute left-full top-0 ml-2 z-50 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl p-3 pointer-events-none">
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5">
            Letzte Aktivität
          </p>
          <p className="text-xs text-white leading-snug">
            <span className="font-medium text-emerald-400">{tooltip.userName}</span>{" "}
            hat{" "}
            <span className="text-zinc-300">
              {tooltip.entityName.length > 20
                ? tooltip.entityName.slice(0, 20) + "…"
                : tooltip.entityName}
            </span>{" "}
            {actionLabels[tooltip.action] ?? tooltip.action}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {new Date(tooltip.createdAt).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            Uhr
          </p>
          {/* Arrow */}
          <span className="absolute top-3 -left-1.5 w-2.5 h-2.5 bg-[#1a1a1a] border-l border-b border-[#2a2a2a] rotate-45" />
        </div>
      )}
    </div>
  );
}

interface SavedView { id: string; name: string; filterRaw: string; icon?: string; }

const DEFAULT_SIDEBAR_VIEWS: SavedView[] = [
  { id: "__meine-tasks", name: "Meine Tasks", filterRaw: "assignee:ich status:offen", icon: "👤" },
  { id: "__diese-woche", name: "Diese Woche fällig", filterRaw: "due:diese-woche", icon: "📅" },
  { id: "__blockiert", name: "Blockiert", filterRaw: "filter:blocked", icon: "🚫" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { setOpen: openShortcuts } = useKeyboardShortcutsModal();
  const { setOpen: openQuickAdd } = useQuickAdd();
  const { data: session } = useSession();
  const [meData, setMeData] = useState<{ username: string; role: string } | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewsExpanded, setViewsExpanded] = useState(true);

  // Load fresh user data from DB via /api/me (JWT doesn't store role)
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setMeData(data); })
        .catch(() => {});
      // Gespeicherte Ansichten laden
      fetch("/api/saved-views")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setSavedViews(data); })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  const username = meData?.username ?? (session?.user as any)?.username ?? session?.user?.name ?? "User";
  const role = meData?.role ?? "user";

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-60 bg-white dark:bg-[#161616] border-r border-gray-200 dark:border-[#2a2a2a] z-50 flex flex-col transition-transform duration-200",
          "lg:translate-x-0 lg:relative lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-[#2a2a2a]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Mission Control</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            // Spezial-Rendering für Team-Link: Tooltip mit letzter Aktivität
            if (item.href === "/team") {
              return (
                <TeamNavItemWithTooltip
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive}
                  onClose={() => setSidebarOpen(false)}
                />
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  isActive
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r-full" />
                )}
                <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-emerald-400" : "")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Gespeicherte Ansichten */}
          <div className="pt-2 mt-1 border-t border-gray-200 dark:border-[#2a2a2a]">
            <button
              onClick={() => setViewsExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> Gespeicherte Ansichten
              </span>
              <span className="text-[8px]">{viewsExpanded ? "▲" : "▼"}</span>
            </button>
            {viewsExpanded && (
              <div className="space-y-0.5">
                {[...DEFAULT_SIDEBAR_VIEWS, ...savedViews].map((view) => (
                  <div key={view.id} className="flex items-center group">
                    <Link
                      href={`/search?q=${encodeURIComponent(view.filterRaw)}`}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                        pathname === "/search"
                          ? "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                      )}
                    >
                      <span className="text-xs">{view.icon ?? "📌"}</span>
                      <span className="truncate text-xs">{view.name}</span>
                    </Link>
                    {!view.id.startsWith("__") && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/saved-views/${view.id}`, { method: "DELETE" });
                          setSavedViews((prev) => prev.filter((v) => v.id !== view.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings links */}
          <div className="pt-2 mt-1 border-t border-gray-200 dark:border-[#2a2a2a]">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Einstellungen
            </p>
            <Link
              href="/settings/profile"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                pathname === "/settings/profile"
                  ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
              )}
            >
              {pathname === "/settings/profile" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
              )}
              <Settings className={cn("w-4 h-4 shrink-0", pathname === "/settings/profile" ? "text-blue-400" : "")} />
              <span>Mein Profil</span>
            </Link>

            <Link
              href="/settings/permissions"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                pathname === "/settings/permissions"
                  ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
              )}
            >
              {pathname === "/settings/permissions" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
              )}
              <ShieldCheck className={cn("w-4 h-4 shrink-0", pathname === "/settings/permissions" ? "text-violet-400" : "")} />
              <span>Berechtigungen</span>
            </Link>

            {role === "admin" && (
              <Link
                href="/settings/users"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/settings/users"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/settings/users" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <UserCog className={cn("w-4 h-4 shrink-0", pathname === "/settings/users" ? "text-blue-400" : "")} />
                <span>Benutzerverwaltung</span>
              </Link>
            )}

            <Link
              href="/settings/notifications"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                pathname === "/settings/notifications"
                  ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
              )}
            >
              {pathname === "/settings/notifications" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r-full" />
              )}
              <BellRing className={cn("w-4 h-4 shrink-0", pathname === "/settings/notifications" ? "text-orange-400" : "")} />
              <span>Benachrichtigungen</span>
            </Link>

            <Link
              href="/settings/system"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                pathname === "/settings/system"
                  ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
              )}
            >
              {pathname === "/settings/system" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full" />
              )}
              <Activity className={cn("w-4 h-4 shrink-0", pathname === "/settings/system" ? "text-red-400" : "")} />
              <span>System-Status</span>
            </Link>
          </div>

          {/* Admin links */}
          {role === "admin" && (
            <div className="pt-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Administration
              </p>
              <Link
                href="/admin/users"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/users"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/users" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <ShieldCheck className={cn("w-4 h-4 shrink-0", pathname === "/admin/users" ? "text-amber-400" : "")} />
                <span>Benutzer (Legacy)</span>
              </Link>
              <Link
                href="/admin/invites"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/invites"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/invites" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Mail className={cn("w-4 h-4 shrink-0", pathname === "/admin/invites" ? "text-amber-400" : "")} />
                <span>Einladungen</span>
              </Link>
              <Link
                href="/admin/audit"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/audit"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/audit" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <ClipboardList className={cn("w-4 h-4 shrink-0", pathname === "/admin/audit" ? "text-amber-400" : "")} />
                <span>Audit Trail</span>
              </Link>
              <Link
                href="/admin/backups"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/backups"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/backups" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Database className={cn("w-4 h-4 shrink-0", pathname === "/admin/backups" ? "text-amber-400" : "")} />
                <span>Backups</span>
              </Link>
              <Link
                href="/admin/monitoring"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/monitoring"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/monitoring" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Activity className={cn("w-4 h-4 shrink-0", pathname === "/admin/monitoring" ? "text-amber-400" : "")} />
                <span>Monitoring</span>
              </Link>
              <Link
                href="/admin/tickets"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/tickets"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/tickets" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Ticket className={cn("w-4 h-4 shrink-0", pathname === "/admin/tickets" ? "text-amber-400" : "")} />
                <span>Support-Tickets</span>
              </Link>
              <Link
                href="/admin/integrations"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/integrations"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/integrations" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Zap className={cn("w-4 h-4 shrink-0", pathname === "/admin/integrations" ? "text-amber-400" : "")} />
                <span>Integrationen</span>
              </Link>
              <Link
                href="/admin/upselling"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/upselling"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/upselling" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <TrendingUp className={cn("w-4 h-4 shrink-0", pathname === "/admin/upselling" ? "text-amber-400" : "")} />
                <span>🎯 Upselling</span>
              </Link>
              <Link
                href="/admin/onboarding"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/onboarding"
                    ? "bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/onboarding" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Users className={cn("w-4 h-4 shrink-0", pathname === "/admin/onboarding" ? "text-amber-400" : "")} />
                <span>🤖 Onboarding</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Quick-Add + Shortcuts */}
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={() => { openQuickAdd(true); setSidebarOpen(false); }}
            data-tour="quick-add"
            className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
          >
            <Zap className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Neuer Task</span>
            <span className="ml-auto text-[10px] font-mono text-gray-500 dark:text-zinc-600 bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded">
              ⌘⇧N
            </span>
          </button>
          <button
            onClick={() => openShortcuts(true)}
            className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
          >
            <Keyboard className="w-4 h-4 shrink-0" />
            <span>Tastenkürzel</span>
            <span className="ml-auto text-[10px] font-mono text-gray-500 dark:text-zinc-600 bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded">
              ⌨️
            </span>
          </button>
        </div>

        {/* User info + Theme Toggle + Logout */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
              {username[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{username}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{role}</p>
            </div>
            <ThemeToggleButton />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Abmelden"
              className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
