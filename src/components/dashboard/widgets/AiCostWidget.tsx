"use client";

import { useEffect, useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { Brain, TrendingUp } from "lucide-react";

interface AiUsageSummary {
  totalCost: number;
  totalTokens: number;
  callCount: number;
  thisMonth: number;
}

export function AiCostWidget() {
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/usage/summary")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="KI-Kosten" icon={<Brain className="w-4 h-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Lade...</div>
      ) : data ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Diesen Monat</span>
            <span className="font-semibold text-sm">
              ${(data.thisMonth ?? 0).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Gesamt</span>
            <span className="font-semibold text-sm">
              ${(data.totalCost ?? 0).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">API-Calls</span>
            <span className="font-semibold text-sm">{data.callCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{(data.totalTokens ?? 0).toLocaleString()} Tokens gesamt</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Keine Daten verfügbar</div>
      )}
    </WidgetShell>
  );
}
