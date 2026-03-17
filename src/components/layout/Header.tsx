"use client";

import { Menu, Bell, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarOpen } = useAppStore();

  return (
    <header className="h-14 border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#0f0f0f] sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-zinc-400 hover:text-white p-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] border border-[#2a2a2a] rounded-md text-xs transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Suchen...</span>
          <kbd className="hidden sm:inline text-[10px] bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
        <button className="relative w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
