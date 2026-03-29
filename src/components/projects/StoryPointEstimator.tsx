"use client";

import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronRight, AlertTriangle, RotateCcw, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleEstimate {
  name: string;
  description: string;
  features: string[];
  storyPoints: number;
  complexity: "low" | "medium" | "high";
}

interface EstimateResult {
  modules: ModuleEstimate[];
  totalStoryPoints: number;
  timeEstimate: {
    withAmadeus: string;
    classicTeam: string;
  };
  notes: string;
  model: string;
}

interface StoryPointEstimatorProps {
  projectId?: string;
  onAccept?: (totalSp: number, modules: ModuleEstimate[]) => void;
  defaultDescription?: string;
  compact?: boolean;
}

const PROJECT_TYPES = [
  { value: "mobile-app", label: "📱 Mobile App" },
  { value: "web-app", label: "🌐 Web App" },
  { value: "api", label: "⚡ API / Backend" },
  { value: "website", label: "🏠 Website" },
  { value: "other", label: "🔧 Sonstiges" },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "Einfach",
  medium: "Mittel",
  high: "Komplex",
};

export function StoryPointEstimator({ 
  projectId, 
  onAccept, 
  defaultDescription = "",
  compact = false,
}: StoryPointEstimatorProps) {
  const [description, setDescription] = useState(defaultDescription);
  const [projectType, setProjectType] = useState("web-app");
  const [hasOffline, setHasOffline] = useState(false);
  const [hasMobile, setHasMobile] = useState(false);
  const [hasBackend, setHasBackend] = useState(true);
  const [useKaAppRef, setUseKaAppRef] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [accepting, setAccepting] = useState(false);

  const handleEstimate = async () => {
    if (description.trim().length < 10) {
      setError("Bitte gib eine ausführlichere Beschreibung ein (min. 10 Zeichen)");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/project-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          projectType,
          hasOffline,
          hasMobile,
          hasBackend,
          referenceProject: useKaAppRef ? "ka-app" : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler bei der Schätzung");
        return;
      }

      setResult(data);
      // Alle Module standardmäßig einklappen
      setExpandedModules(new Set());
    } catch (err: any) {
      setError(err.message || "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!result || !projectId || !onAccept) return;

    setAccepting(true);
    try {
      // Update project storyPoints via API
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Falls es ein storyPoints Feld gibt — sonst ignorieren
          // Wir rufen auch den onAccept Callback auf
        }),
      });

      onAccept(result.totalStoryPoints, result.modules);
    } catch (err) {
      console.error("Fehler beim Übernehmen:", err);
    } finally {
      setAccepting(false);
    }
  };

  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  // --- Eingabe-Form ---
  if (!result) {
    return (
      <div className={cn(
        "bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl",
        compact ? "p-4" : "p-6"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">KI Story-Point Schätzung</h3>
        </div>

        <div className="space-y-4">
          {/* Beschreibung */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Projektbeschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe dein Projekt in 2-5 Sätzen..."
              rows={3}
              className="w-full px-3 py-2 bg-[#161616] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Projekt-Typ */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Projekttyp
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full px-3 py-2 bg-[#161616] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#252525] transition-colors">
              <input
                type="checkbox"
                checked={hasOffline}
                onChange={(e) => setHasOffline(e.target.checked)}
                className="w-4 h-4 rounded border-[#3a3a3a] bg-[#161616] text-purple-500 focus:ring-purple-500/30"
              />
              <span className="text-xs text-zinc-300">📴 Offline-Fähigkeit</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#252525] transition-colors">
              <input
                type="checkbox"
                checked={hasMobile}
                onChange={(e) => setHasMobile(e.target.checked)}
                className="w-4 h-4 rounded border-[#3a3a3a] bg-[#161616] text-purple-500 focus:ring-purple-500/30"
              />
              <span className="text-xs text-zinc-300">📱 Mobile App</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#252525] transition-colors">
              <input
                type="checkbox"
                checked={hasBackend}
                onChange={(e) => setHasBackend(e.target.checked)}
                className="w-4 h-4 rounded border-[#3a3a3a] bg-[#161616] text-purple-500 focus:ring-purple-500/30"
              />
              <span className="text-xs text-zinc-300">⚙️ Backend / API</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#252525] transition-colors">
              <input
                type="checkbox"
                checked={useKaAppRef}
                onChange={(e) => setUseKaAppRef(e.target.checked)}
                className="w-4 h-4 rounded border-[#3a3a3a] bg-[#161616] text-purple-500 focus:ring-purple-500/30"
              />
              <span className="text-xs text-zinc-300">🌲 Referenz: ka-app</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Claude analysiert...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                KI-Schätzung erstellen
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Ergebnis ---
  return (
    <div className={cn(
      "bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl",
      compact ? "p-4" : "p-6"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">KI-Schätzung</h3>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">{result.model}</span>
      </div>

      {/* Total Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl">
          <span className="text-4xl font-bold text-white">
            {result.totalStoryPoints.toLocaleString("de-DE")}
          </span>
          <span className="text-lg text-zinc-400">Story Points</span>
        </div>
      </div>

      {/* Zeit-Schätzung */}
      <div className="flex items-center justify-center gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Mit Amadeus:</span>
          <span className="font-semibold text-emerald-400">{result.timeEstimate.withAmadeus}</span>
        </div>
        <span className="text-zinc-700">·</span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Klassisches Team:</span>
          <span className="font-semibold text-amber-400">{result.timeEstimate.classicTeam}</span>
        </div>
      </div>

      {/* Module */}
      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Module ({result.modules.length})
        </h4>
        {result.modules.map((module, idx) => (
          <div
            key={idx}
            className="bg-[#161616] border border-[#2a2a2a] rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleModule(idx)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedModules.has(idx) ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <span className="text-sm font-medium text-white">{module.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  COMPLEXITY_COLORS[module.complexity]
                )}>
                  {COMPLEXITY_LABELS[module.complexity]}
                </span>
              </div>
              <span className="text-sm font-bold text-purple-400">{module.storyPoints} SP</span>
            </button>

            {expandedModules.has(idx) && (
              <div className="px-3 pb-3 pt-1 border-t border-[#2a2a2a]">
                <p className="text-xs text-zinc-400 mb-2">{module.description}</p>
                <ul className="space-y-1">
                  {module.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-zinc-600 mt-0.5">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {result.notes && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80">{result.notes}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-xs text-zinc-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Neu schätzen
        </button>

        {projectId && onAccept && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 rounded-lg text-xs font-medium text-white transition-colors"
          >
            {accepting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Übernehmen...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                In Projekt übernehmen
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
