"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Timer,
  FolderKanban,
  Brain,
  FileText,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Aufgaben" },
  { href: "/sprints", icon: Flag, label: "Sprints" },
  { href: "/timeline", icon: GanttChartSquare, label: "Timeline" },
  { href: "/digest", icon: Newspaper, label: "KI-Digest" },
  { href: "/calendar", icon: CalendarDays, label: "Kalender" },
  { href: "/cronjobs", icon: Timer, label: "Cron Jobs" },
  { href: "/projects", icon: FolderKanban, label: "Projekte" },
  { href: "/memory", icon: Brain, label: "Memory" },
  { href: "/docs", icon: FileText, label: "Dokumente" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/tools", icon: Wrench, label: "Tools" },
  { href: "/databases", icon: Database, label: "Datenbanken" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" },
  { href: "/agents", icon: BotIcon, label: "Agenten" },
  { href: "/diagram", icon: GitGraph, label: "Diagramm" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { data: session } = useSession();
  const [meData, setMeData] = useState<{ username: string; role: string } | null>(null);

  // Load fresh user data from DB via /api/me (JWT doesn't store role)
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setMeData(data); })
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
          "fixed top-0 left-0 h-full w-60 bg-[#161616] border-r border-[#2a2a2a] z-50 flex flex-col transition-transform duration-200",
          "lg:translate-x-0 lg:relative lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2a2a2a]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white text-sm">Mission Control</span>
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group",
                  isActive
                    ? "bg-[#252525] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-[#1e1e1e]"
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

          {/* Admin links */}
          {role === "admin" && (
            <>
              <Link
                href="/admin/users"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/users"
                    ? "bg-[#252525] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/users" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <ShieldCheck className={cn("w-4 h-4 shrink-0", pathname === "/admin/users" ? "text-amber-400" : "")} />
                <span>Benutzer</span>
              </Link>
              <Link
                href="/admin/audit"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group",
                  pathname === "/admin/audit"
                    ? "bg-[#252525] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-[#1e1e1e]"
                )}
              >
                {pathname === "/admin/audit" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <ClipboardList className={cn("w-4 h-4 shrink-0", pathname === "/admin/audit" ? "text-amber-400" : "")} />
                <span>Audit Trail</span>
              </Link>
            </>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="px-4 py-4 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
              {username[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{username}</p>
              <p className="text-xs text-zinc-500 truncate">{role}</p>
            </div>
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
