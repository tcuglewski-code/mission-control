"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, FolderKanban, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Aufgaben" },
  { href: "/projects", icon: FolderKanban, label: "Projekte" },
  { href: "/inbox", icon: Bell, label: "Benachrichtigungen" },
];

export function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-[#161616] border-t border-gray-200 dark:border-[#2a2a2a] safe-area-inset-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-emerald-500"
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
