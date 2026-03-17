"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, Tag, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryCardProps {
  entry: MemoryEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  credentials: { bg: "bg-red-500/10", text: "text-red-400", icon: "🔑" },
  architecture: { bg: "bg-blue-500/10", text: "text-blue-400", icon: "🏗️" },
  decisions: { bg: "bg-purple-500/10", text: "text-purple-400", icon: "⚡" },
  general: { bg: "bg-zinc-700/20", text: "text-zinc-400", icon: "📝" },
  research: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "🔍" },
};

export function MemoryCard({ entry, onEdit, onDelete }: MemoryCardProps) {
  const catStyle = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.general;
  const tags = entry.tags ? entry.tags.split(",").map((t) => t.trim()) : [];

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{catStyle.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-white line-clamp-1">{entry.title}</h3>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", catStyle.bg, catStyle.text)}>
              {entry.category}
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

      {/* Content */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-3 whitespace-pre-line">
        {entry.content}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-[#252525] text-zinc-500 rounded">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {entry.source && (
          <span className="text-[10px] text-zinc-600">Quelle: {entry.source}</span>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto">
          {format(new Date(entry.updatedAt), "d. MMM yyyy", { locale: de })}
        </span>
      </div>
    </div>
  );
}
