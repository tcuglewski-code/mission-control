"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Bot, User, Edit2, Trash2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface AgentCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    createdAt: Date;
    _count?: { tasks: number };
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function AgentCard({ user, onEdit, onDelete }: AgentCardProps) {
  const isAgent = user.role === "agent";

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border",
              isAgent
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            )}
          >
            {getInitials(user.name)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{user.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAgent ? (
                <Bot className="w-3 h-3 text-purple-400" />
              ) : (
                <User className="w-3 h-3 text-emerald-400" />
              )}
              <span className={cn("text-[11px]", isAgent ? "text-purple-400" : "text-emerald-400")}>
                {user.role}
              </span>
            </div>
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

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("w-2 h-2 rounded-full", isAgent ? "bg-purple-500" : "bg-emerald-500")} />
        <span className="text-xs text-zinc-400">{isAgent ? "AI Agent · Aktiv" : "Human · Online"}</span>
      </div>

      {/* Email */}
      <p className="text-xs text-zinc-600 mb-3 truncate">{user.email}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-3 border-t border-[#2a2a2a]">
        <span>{user._count?.tasks ?? 0} Tasks zugewiesen</span>
        <span>seit {format(new Date(user.createdAt), "MMM yyyy", { locale: de })}</span>
      </div>
    </div>
  );
}
