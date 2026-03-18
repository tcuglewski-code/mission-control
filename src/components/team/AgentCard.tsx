"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Bot, User, Edit2, Trash2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    description?: string | null;
    tools?: string | null;
    skills?: string | null;
    createdAt: Date;
    _count?: { tasks: number };
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function AgentCard({ user, onEdit, onDelete }: AgentCardProps) {
  const isAgent = user.role === "agent";

  let toolList: string[] = [];
  let skillList: string[] = [];

  try {
    if (user.tools) toolList = JSON.parse(user.tools);
  } catch {}
  try {
    if (user.skills) skillList = JSON.parse(user.skills);
  } catch {}

  const hasEmoji = user.avatar && /\p{Emoji}/u.test(user.avatar);

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors group flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0",
              isAgent
                ? "bg-purple-500/10 border-purple-500/20"
                : "bg-emerald-500/10 border-emerald-500/20"
            )}
          >
            {hasEmoji ? (
              <span>{user.avatar}</span>
            ) : (
              <span className={cn("text-sm font-bold", isAgent ? "text-purple-300" : "text-emerald-300")}>
                {user.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">{user.name}</h3>
            {/* Role Badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                isAgent
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}
            >
              {isAgent ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
              {isAgent ? "KI-Agent" : "Mensch"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {user.description && (
        <p className="text-xs text-zinc-400 leading-relaxed">
          {user.description}
        </p>
      )}

      {/* Tools */}
      {toolList.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">Tools</p>
          <div className="flex flex-wrap gap-1">
            {toolList.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 text-[10px] bg-[#252525] border border-[#333] text-zinc-400 rounded-md"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skillList.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">Fähigkeiten</p>
          <div className="flex flex-wrap gap-1">
            {skillList.map((skill) => (
              <span
                key={skill}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md font-medium",
                  isAgent
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-3 border-t border-[#2a2a2a] mt-auto">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-3 h-3" />
          <span>{user._count?.tasks ?? 0} offene Tasks</span>
        </div>
        <span>seit {format(new Date(user.createdAt), "MMM yyyy", { locale: de })}</span>
      </div>
    </div>
  );
}
