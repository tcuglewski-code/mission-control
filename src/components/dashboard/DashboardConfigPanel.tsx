"use client";

import { useRef, useState, useCallback } from "react";
import { X, GripVertical, RotateCcw, Eye, EyeOff } from "lucide-react";
import { WidgetConfig } from "@/lib/widgets";
import { AVAILABLE_WIDGETS } from "@/lib/widgets";

interface DashboardConfigPanelProps {
  config: WidgetConfig[];
  onToggle: (id: string) => void;
  onReorder: (newConfig: WidgetConfig[]) => void;
  onReset: () => void;
  onClose: () => void;
}

export function DashboardConfigPanel({
  config,
  onToggle,
  onReorder,
  onReset,
  onClose,
}: DashboardConfigPanelProps) {
  const sorted = [...config].sort((a, b) => a.order - b.order);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
    setDragging(index);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOver.current = index;
    setDragOverIdx(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOver.current = null;
      setDragging(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const newConfig = reordered.map((item, idx) => ({ ...item, order: idx }));
    onReorder(newConfig);

    dragItem.current = null;
    dragOver.current = null;
    setDragging(null);
    setDragOverIdx(null);
  }, [sorted, onReorder]);

  const getWidgetDef = (id: string) =>
    AVAILABLE_WIDGETS.find((w) => w.id === id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-[#161616] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-sm font-semibold text-white">Dashboard anpassen</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Widgets ein-/ausblenden und sortieren</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-1">
          {sorted.map((item, idx) => {
            const def = getWidgetDef(item.id);
            if (!def) return null;
            const isDraggingThis = dragging === idx;
            const isDragTarget = dragOverIdx === idx && dragging !== idx;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all cursor-default select-none
                  ${isDraggingThis ? "opacity-40 border-[#444] bg-[#222]" : "border-[#2a2a2a] bg-[#1c1c1c]"}
                  ${isDragTarget ? "border-emerald-500/50 bg-emerald-500/5" : ""}
                  hover:border-[#333]
                `}
              >
                {/* Drag handle */}
                <div
                  className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 shrink-0"
                  title="Ziehen zum Sortieren"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{def.title}</p>
                  <p className="text-[11px] text-zinc-600 truncate">{def.description}</p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => onToggle(item.id)}
                  className={`
                    w-8 h-8 rounded-md flex items-center justify-center transition-colors shrink-0
                    ${item.visible
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-[#2a2a2a] text-zinc-600 hover:bg-[#333] hover:text-zinc-400"}
                  `}
                  title={item.visible ? "Widget ausblenden" : "Widget einblenden"}
                >
                  {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] hover:border-[#3a3a3a] hover:bg-[#222] text-sm text-zinc-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Standard wiederherstellen
          </button>
        </div>
      </div>
    </>
  );
}
