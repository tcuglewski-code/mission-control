"use client";

import { Menu } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { NotificationBell } from "./NotificationBell";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarOpen } = useAppStore();
  const { setOpen } = useCommandPalette();

  return (
    <header
      role="banner"
      className="h-14 border-b border-gray-200 dark:border-[#2a2a2a] flex items-center justify-between px-6 bg-white dark:bg-[#0f0f0f] sticky top-0 z-30"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-zinc-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-[#252525] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Seitennavigation öffnen"
          aria-haspopup="true"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-zinc-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] rounded-md text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Befehlspalette öffnen (Strg+K)"
          aria-keyshortcuts="Control+k Meta+k"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Suchen...</span>
          <kbd className="hidden sm:inline text-[10px] bg-[#2a2a2a] px-1.5 py-0.5 rounded" aria-hidden="true">
            ⌘K
          </kbd>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}
