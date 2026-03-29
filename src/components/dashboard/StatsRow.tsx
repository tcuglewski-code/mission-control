import { FolderKanban, CheckSquare, Users, Activity } from "lucide-react";

interface StatsRowProps {
  activeProjects: number;
  openTasks: number;
  teamMembers: number;
  activityToday: number;
}

export function StatsRow({ activeProjects, openTasks, teamMembers, activityToday }: StatsRowProps) {
  const stats = [
    {
      label: "Aktive Projekte",
      value: activeProjects,
      icon: FolderKanban,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      trend: "+1 diese Woche",
    },
    {
      label: "Offene Tasks",
      value: openTasks,
      icon: CheckSquare,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      trend: "3 fällig heute",
    },
    {
      label: "Team-Mitglieder",
      value: teamMembers,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      trend: "1 Agent aktiv",
    },
    {
      label: "Aktivität heute",
      value: activityToday,
      icon: Activity,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      trend: "↑ vs. gestern",
    },
  ];

  return (
    /* Mobile: horizontal scroll; Desktop: 4-column grid */
    <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0 scrollbar-hide">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition-colors shrink-0 w-[160px] lg:w-auto"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
          <div className="text-xs text-zinc-400">{stat.label}</div>
          <div className="text-xs text-zinc-600 mt-1">{stat.trend}</div>
        </div>
      ))}
    </div>
  );
}
