import Link from "next/link";
import { Megaphone, Pin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  createdAt: Date;
}

interface AnnouncementsWidgetProps {
  announcements: Announcement[];
}

const PRIORITY_COLORS: Record<string, string> = {
  normal: "text-zinc-400",
  wichtig: "text-yellow-400",
  dringend: "text-red-400",
};

export function AnnouncementsWidget({ announcements }: AnnouncementsWidgetProps) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Ankündigungen</h2>
        </div>
        <Link
          href="/announcements"
          className="text-xs text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          Alle anzeigen <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-[#1e1e1e]">
        {announcements.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Keine Ankündigungen
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="px-5 py-3 hover:bg-[#1a1a1a] transition-colors">
              <div className="flex items-start gap-2">
                {a.pinned && <Pin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        PRIORITY_COLORS[a.priority] ?? "text-white"
                      )}
                    >
                      {a.title}
                    </p>
                    {a.priority !== "normal" && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          a.priority === "dringend"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        )}
                      >
                        {a.priority === "dringend" ? "Dringend" : "Wichtig"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {announcements.length > 0 && (
        <div className="px-5 py-3 border-t border-[#1e1e1e]">
          <Link
            href="/announcements"
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            Alle Ankündigungen ansehen <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
