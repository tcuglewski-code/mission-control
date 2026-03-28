"use client";

import { useState } from "react";
import { Sparkles, X, ChevronDown } from "lucide-react";

interface AiProjectSummaryProps {
  projectId: string;
  projectName: string;
}

export function AiProjectSummary({ projectId, projectName }: AiProjectSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/project-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.aiAvailable === false) {
          setError("KI nicht verfügbar — ANTHROPIC_API_KEY ist noch nicht in Vercel gesetzt.");
        } else {
          setError(data.error ?? "Fehler beim Generieren");
        }
        return;
      }
      setSummary(data.summary);
      setOpen(true);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">KI-Zusammenfassung</h2>
        </div>
        {summary && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {summary && open && (
        <div className="mb-3 p-3 bg-[#171717] border border-[#2a2a2a] rounded-lg">
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2a2a2a]">
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Generiert von Claude {/* claude-3-5-haiku-20241022 */}
            </span>
            <button
              type="button"
              onClick={() => setSummary(null)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg disabled:opacity-50 transition-colors font-medium"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {loading
          ? "KI analysiert..."
          : summary
          ? "Neu generieren"
          : `${projectName} zusammenfassen`}
      </button>
    </div>
  );
}
