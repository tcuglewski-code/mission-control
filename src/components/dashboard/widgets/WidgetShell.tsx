import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";

interface WidgetShellProps {
  title: string;
  icon: ReactNode;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  badge?: ReactNode;
}

export function WidgetShell({
  title,
  icon,
  href,
  linkLabel = "Alle anzeigen",
  children,
  badge,
}: WidgetShellProps) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {href && (
            <Link
              href={href}
              className="text-xs text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              {linkLabel} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
