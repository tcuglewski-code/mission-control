import Link from "next/link";
import { Users } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { getInitials } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  avatar?: string | null;
  openTaskCount: number;
}

interface TeamAuslastungWidgetProps {
  members: TeamMember[];
  maxTasks?: number;
}

function getLoadColor(count: number, max: number): string {
  if (max === 0) return "bg-zinc-600";
  const ratio = count / max;
  if (ratio < 0.4) return "bg-emerald-500";
  if (ratio < 0.7) return "bg-yellow-500";
  return "bg-red-500";
}

export function TeamAuslastungWidget({
  members,
  maxTasks = 10,
}: TeamAuslastungWidgetProps) {
  const sorted = [...members].sort((a, b) => b.openTaskCount - a.openTaskCount);
  const highest = sorted[0]?.openTaskCount ?? 0;

  return (
    <WidgetShell
      title="Team-Auslastung"
      icon={<Users className="w-4 h-4 text-blue-400" />}
      href="/team"
    >
      <div className="divide-y divide-[#222]">
        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">
            Keine Teammitglieder
          </div>
        ) : (
          sorted.slice(0, 6).map((member) => {
            const pct = highest > 0 ? Math.round((member.openTaskCount / highest) * 100) : 0;
            const barColor = getLoadColor(member.openTaskCount, maxTasks);
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-[10px] font-semibold text-zinc-300 shrink-0">
                    {getInitials(member.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">
                  {member.openTaskCount} Tasks
                </span>
              </div>
            );
          })
        )}
      </div>
    </WidgetShell>
  );
}
