"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface UsageData {
  totalTokens: number;
  totalCostUsd: number;
  bySource: {
    api: { tokens: number; cost: number };
    max: { tokens: number; cost: number };
  };
  byDay: Array<{ date: string; tokens: number; cost: number }>;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`;
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
}

// Simple sparkline component
function Sparkline({ data, color = "#10b981" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AiCostWidget() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/usage?period=30d")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get last 7 days of data for sparkline
  const last7Days = data?.byDay?.slice(-7) || [];
  const sparklineData = last7Days.map((d) => d.cost);

  // Calculate trend (compare last 7 days to previous 7)
  const last14Days = data?.byDay?.slice(-14) || [];
  const recentCost = last7Days.reduce((sum, d) => sum + d.cost, 0);
  const previousCost = last14Days.slice(0, 7).reduce((sum, d) => sum + d.cost, 0);
  const trend = previousCost > 0 ? ((recentCost - previousCost) / previousCost) * 100 : 0;

  return (
    <WidgetShell title="🤖 KI-Kosten" icon={<Brain className="w-4 h-4 text-purple-400" />}>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
          Keine Daten verfügbar
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main cost display */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-bold text-white">
                {formatCost(data.totalCostUsd)}
              </p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {formatTokens(data.totalTokens)} Tokens (30 Tage)
              </p>
            </div>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                trend > 0 
                  ? "bg-red-500/10 text-red-400" 
                  : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend).toFixed(0)}%
              </div>
            )}
          </div>

          {/* API vs Max badges */}
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
              API: {formatCost(data.bySource.api.cost)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
              Max: {formatCost(data.bySource.max.cost)}
            </span>
          </div>

          {/* Sparkline */}
          {sparklineData.length > 1 && (
            <div className="pt-2 border-t border-[#2a2a2a]">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                Letzte 7 Tage
              </p>
              <Sparkline data={sparklineData} />
            </div>
          )}

          {/* Link to details */}
          <Link
            href="/ai-usage"
            className="flex items-center justify-center gap-2 w-full py-2 mt-2 text-sm text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors"
          >
            Details anzeigen
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
