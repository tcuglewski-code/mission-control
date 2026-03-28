"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { CheckSquare, Zap, Clock, Activity } from "lucide-react";

interface ProjectStatusBannerProps {
  projectId: string;
  openTasks: number;
  inSprintTasks: number;
  dueTodayTasks: number;
  lastActivityAt: Date | string | null;
}

export function ProjectStatusBanner({
  projectId,
  openTasks,
  inSprintTasks,
  dueTodayTasks,
  lastActivityAt,
}: ProjectStatusBannerProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-3">
      {/* Offene Tasks */}
      <Link
        href={`/tasks?projectId=${projectId}&status=open`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors group"
      >
        <CheckSquare className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
        <span className="text-xs text-zinc-400 group-hover:text-zinc-200">
          <span className="font-semibold text-white">{openTasks}</span> Offen
        </span>
      </Link>

      {/* Im Sprint */}
      <Link
        href={`/projects/${projectId}/sprints`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors group"
      >
        <Zap className="w-3 h-3 text-emerald-600 group-hover:text-emerald-400" />
        <span className="text-xs text-zinc-400 group-hover:text-zinc-200">
          <span className="font-semibold text-emerald-400">{inSprintTasks}</span> Im Sprint
        </span>
      </Link>

      {/* Fällig heute */}
      <Link
        href={`/tasks?projectId=${projectId}&due=today`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors group ${
          dueTodayTasks > 0
            ? "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40"
            : "bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#1e1e1e]"
        }`}
      >
        <Clock
          className={`w-3 h-3 ${
            dueTodayTasks > 0 ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300"
          }`}
        />
        <span
          className={`text-xs ${
            dueTodayTasks > 0 ? "text-orange-300" : "text-zinc-400 group-hover:text-zinc-200"
          }`}
        >
          <span
            className={`font-semibold ${
              dueTodayTasks > 0 ? "text-orange-400" : "text-white"
            }`}
          >
            {dueTodayTasks}
          </span>{" "}
          Fällig heute
        </span>
      </Link>

      {/* Letzte Aktivität */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] border border-[#2a2a2a] rounded-lg">
        <Activity className="w-3 h-3 text-zinc-600" />
        <span className="text-xs text-zinc-500">
          {lastActivityAt
            ? formatRelativeTime(new Date(lastActivityAt))
            : "Keine Aktivität"}
        </span>
      </div>
    </div>
  );
}
