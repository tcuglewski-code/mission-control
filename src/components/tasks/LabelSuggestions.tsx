"use client";

import { useMemo } from "react";
import { Tag, Sparkles } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelSuggestionsProps {
  title: string;
  availableLabels: Label[];
  selectedLabelIds: Set<string>;
  onToggleLabel: (labelId: string) => void;
  maxSuggestions?: number;
}

/**
 * Fuzzy-Match: Schlägt Labels basierend auf dem Task-Titel vor.
 * Rein Frontend, keine API-Anfragen.
 */
function computeLabelSuggestions(
  title: string,
  labels: Label[],
  maxSuggestions: number
): Label[] {
  if (!title || title.trim().length < 3 || labels.length === 0) return [];

  const titleLower = title.toLowerCase();
  const titleWords = titleLower
    .replace(/[^\w\säöüß]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return labels
    .map((label) => {
      const nameLower = label.name.toLowerCase();
      const nameWords = nameLower.split(/[\s\-_/]+/).filter((w) => w.length > 2);

      let score = 0;

      // Direkte Übereinstimmung
      if (titleLower.includes(nameLower)) score += 3;
      if (nameLower.includes(titleLower.slice(0, 5))) score += 1;

      // Token-Überschneidung
      for (const tw of titleWords) {
        for (const nw of nameWords) {
          if (tw === nw) score += 2;
          else if (tw.includes(nw) || nw.includes(tw)) score += 1;
        }
      }

      return { label, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((x) => x.label);
}

export function LabelSuggestions({
  title,
  availableLabels,
  selectedLabelIds,
  onToggleLabel,
  maxSuggestions = 4,
}: LabelSuggestionsProps) {
  const suggestions = useMemo(
    () => computeLabelSuggestions(title, availableLabels, maxSuggestions),
    [title, availableLabels, maxSuggestions]
  );

  // Nur nicht-ausgewählte Vorschläge anzeigen
  const unselectedSuggestions = suggestions.filter((l) => !selectedLabelIds.has(l.id));

  if (unselectedSuggestions.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] text-zinc-600">Vorgeschlagene Labels:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unselectedSuggestions.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggleLabel(label.id)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed hover:border-solid transition-all"
            style={{
              borderColor: label.color + "60",
              color: label.color,
              backgroundColor: label.color + "10",
            }}
            title={`Label "${label.name}" hinzufügen`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
            <Tag className="w-2 h-2 ml-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
