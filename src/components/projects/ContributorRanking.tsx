"use client";

import { getInitials } from "@/lib/utils";

export interface ContributorStats {
  userId: string;
  name: string;
  avatar?: string | null;
  tasksCompleted: number;
  comments: number;
  timeEntries: number;
  totalScore: number;
}

interface ContributorRankingProps {
  contributors: ContributorStats[];
}

const BADGES = [
  { label: "🥇", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { label: "🥈", bg: "bg-zinc-400/10 border-zinc-400/30 text-zinc-300" },
  { label: "🥉", bg: "bg-orange-600/10 border-orange-600/30 text-orange-500" },
];

export function ContributorRanking({ contributors }: ContributorRankingProps) {
  if (contributors.length === 0) {
    return (
      <p className="text-center text-zinc-600 text-sm py-4">
        Noch keine Beiträge erfasst
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {contributors.slice(0, 5).map((c, i) => {
        const badge = BADGES[i];
        return (
          <div
            key={c.userId}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              badge
                ? badge.bg
                : "bg-[#161616] border-[#2a2a2a]"
            }`}
          >
            {/* Rang */}
            <div className="w-6 text-center">
              {badge ? (
                <span className="text-base">{badge.label}</span>
              ) : (
                <span className="text-xs text-zinc-600 font-mono">#{i + 1}</span>
              )}
            </div>

            {/* Avatar */}
            {c.avatar ? (
              <img
                src={c.avatar}
                alt={c.name}
                className="w-7 h-7 rounded-full object-cover border border-[#3a3a3a]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                {getInitials(c.name)}
              </div>
            )}

            {/* Name + Stats */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500">
                  ✓ {c.tasksCompleted} Tasks
                </span>
                {c.comments > 0 && (
                  <span className="text-[10px] text-zinc-500">
                    💬 {c.comments}
                  </span>
                )}
                {c.timeEntries > 0 && (
                  <span className="text-[10px] text-zinc-500">
                    ⏱ {c.timeEntries}
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-xs font-bold tabular-nums text-zinc-300">
              {c.totalScore}
            </div>
          </div>
        );
      })}
    </div>
  );
}
