"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FolderKanban, CheckSquare } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { getRecentVisits, type RecentVisit } from "@/hooks/useRecentVisits";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export function ZuletztBesuchtWidget() {
  const [visits, setVisits] = useState<RecentVisit[]>([]);

  useEffect(() => {
    setVisits(getRecentVisits().slice(0, 5));
  }, []);

  return (
    <WidgetShell
      title="Zuletzt besucht"
      icon={<Clock className="w-4 h-4 text-blue-400" />}
    >
      <div className="divide-y divide-[#222]">
        {visits.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Noch keine besuchten Seiten
          </div>
        ) : (
          visits.map((visit) => (
            <Link
              key={`${visit.id}-${visit.visitedAt}`}
              href={visit.href}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors group"
            >
              <div className="shrink-0 w-7 h-7 rounded-md bg-[#252525] border border-[#2a2a2a] flex items-center justify-center">
                {visit.type === "project" ? (
                  <FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                  {visit.name}
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {visit.type === "project" ? "Projekt" : "Task"} ·{" "}
                  {formatDistanceToNow(new Date(visit.visitedAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </WidgetShell>
  );
}
