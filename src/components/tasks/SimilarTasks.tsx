"use client";

import { useMemo } from "react";
import { Network } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  project?: { name: string; color: string } | null;
}

interface SimilarTasksProps {
  currentTaskId: string;
  currentTitle: string;
  allTasks: Task[];
  onSelectTask?: (task: Task) => void;
  maxResults?: number;
}

/**
 * Fuzzy-Match Scoring: Berechnet Ähnlichkeit zwischen zwei Strings.
 * Einfache Token-Überschneidung (Bag of Words), case-insensitive.
 */
function fuzzyScore(a: string, b: string): number {
  if (!a || !b) return 0;

  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^\w\säöüß]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2); // Kurzwörter ignorieren

  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) overlap++;
    else {
      // Teilstring-Match: z.B. "aufforstung" matched "aufforstungs"
      tokensB.forEach((tb) => {
        if (tb.includes(token) || token.includes(tb)) overlap += 0.5;
      });
    }
  });

  // Jaccard-ähnlicher Score
  const union = tokensA.size + tokensB.size - overlap;
  return union > 0 ? overlap / union : 0;
}

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-orange-500",
  in_review: "bg-blue-500",
  backlog: "bg-zinc-600",
  todo: "bg-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Bearbeitung",
  in_review: "In Prüfung",
  done: "Erledigt",
};

export function SimilarTasks({
  currentTaskId,
  currentTitle,
  allTasks,
  onSelectTask,
  maxResults = 5,
}: SimilarTasksProps) {
  const similar = useMemo(() => {
    if (!currentTitle || currentTitle.trim().length < 3) return [];

    return allTasks
      .filter((t) => t.id !== currentTaskId && t.status !== "done")
      .map((t) => ({
        ...t,
        score: fuzzyScore(currentTitle, t.title),
      }))
      .filter((t) => t.score > 0.1) // Mindest-Score
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [currentTaskId, currentTitle, allTasks, maxResults]);

  if (similar.length === 0) return null;

  return (
    <div className="border-t border-[#2a2a2a] pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-3.5 h-3.5 text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Ähnliche Tasks
        </h4>
        <span className="text-[10px] text-zinc-600">({similar.length})</span>
      </div>

      <div className="space-y-1.5">
        {similar.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelectTask?.(task)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#171717] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#1f1f1f] transition-colors text-left group"
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-zinc-600"}`}
            />
            <span className="text-xs text-zinc-300 flex-1 truncate group-hover:text-white transition-colors">
              {task.title}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {task.project && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: task.project.color }}
                >
                  {task.project.name}
                </span>
              )}
              <span className="text-[9px] text-zinc-700">
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
