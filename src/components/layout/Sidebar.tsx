"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Aufgaben" },
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
  { href: "/diagram", icon: GitGraph, label: "Diagramm" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

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
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">Tomek</p>
              <p className="text-xs text-zinc-500 truncate">human · owner</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>
    </>
  );
}
