"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Tag, Edit2, Trash2, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocCardProps {
  doc: {
    id: string;
    title: string;
    content: string;
    type: string;
    tags?: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    project?: { name: string } | null;
  };
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  doc: { bg: "bg-purple-500/10", text: "text-purple-400" },
  architecture: { bg: "bg-blue-500/10", text: "text-blue-400" },
  api: { bg: "bg-orange-500/10", text: "text-orange-400" },
  guide: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  spec: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  report: { bg: "bg-red-500/10", text: "text-red-400" },
  concept: { bg: "bg-indigo-500/10", text: "text-indigo-400" },
  prompts: { bg: "bg-pink-500/10", text: "text-pink-400" },
};

export function DocCard({ doc, onEdit, onDelete, onClick }: DocCardProps) {
  const typeStyle = TYPE_COLORS[doc.type] ?? TYPE_COLORS.doc;
  const tags = doc.tags ? doc.tags.split(",").map((t) => t.trim()) : [];
  const preview = doc.content.replace(/^#+\s/gm, "").replace(/\n/g, " ").slice(0, 140);

  return (
    <div
      className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors group cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
          <h3 className="text-sm font-semibold text-white line-clamp-1">{doc.title}</h3>
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
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

      {/* Type + Project */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", typeStyle.bg, typeStyle.text)}>
          {doc.type}
        </span>
        {doc.project && (
          <span className="text-[10px] text-zinc-600">{doc.project.name}</span>
        )}
      </div>

      {/* Preview */}
      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{preview}{preview.length >= 140 ? "..." : ""}</p>

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
        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
          <GitBranch className="w-3 h-3" />
          v{doc.version}
        </div>
        <span className="text-[10px] text-zinc-600">
          {format(new Date(doc.updatedAt), "d. MMM yyyy", { locale: de })}
        </span>
      </div>
    </div>
  );
}
