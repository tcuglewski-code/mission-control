"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WidgetShell } from "./WidgetShell";
import { FileText, TrendingUp, Clock, BarChart2, Loader2 } from "lucide-react";

interface QuoteStats {
  offeneAngebote: number;
  annahmerate: number;
  avgAmount: number;
  totalCount: number;
  acceptedCount: number;
  declinedCount: number;
  sentCount: number;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function AngeboteWidget() {
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quotes/stats")
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell
      title="Angebote"
      icon={<FileText className="w-4 h-4" />}
      href="/quotes"
      linkLabel="Alle"
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : !stats ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Keine Daten</div>
      ) : (
        <div className="space-y-3">
          {/* KPI-Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Offene Angebote */}
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-bold text-white">{stats.offeneAngebote}</div>
              <div className="text-xs text-zinc-500 leading-tight">Offen</div>
            </div>

            {/* Annahmerate */}
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-bold text-white">
                {stats.annahmerate > 0 ? `${stats.annahmerate}%` : "–"}
              </div>
              <div className="text-xs text-zinc-500 leading-tight">Annahme</div>
            </div>

            {/* Ø Angebotssumme */}
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-bold text-white leading-tight">
                {stats.avgAmount > 0 ? formatEur(stats.avgAmount) : "–"}
              </div>
              <div className="text-xs text-zinc-500 leading-tight">⌀ Summe</div>
            </div>
          </div>

          {/* Status-Verteilung */}
          {stats.totalCount > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-zinc-500">Gesamt: {stats.totalCount} Angebote</div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                {stats.acceptedCount > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(stats.acceptedCount / stats.totalCount) * 100}%` }}
                    title={`Angenommen: ${stats.acceptedCount}`}
                  />
                )}
                {stats.sentCount > 0 && (
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(stats.sentCount / stats.totalCount) * 100}%` }}
                    title={`Gesendet: ${stats.sentCount}`}
                  />
                )}
                {stats.declinedCount > 0 && (
                  <div
                    className="bg-red-500"
                    style={{ width: `${(stats.declinedCount / stats.totalCount) * 100}%` }}
                    title={`Abgelehnt: ${stats.declinedCount}`}
                  />
                )}
                {(stats.totalCount - stats.acceptedCount - stats.sentCount - stats.declinedCount) > 0 && (
                  <div
                    className="bg-zinc-600"
                    style={{ width: `${((stats.totalCount - stats.acceptedCount - stats.sentCount - stats.declinedCount) / stats.totalCount) * 100}%` }}
                    title="Sonstige"
                  />
                )}
              </div>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {stats.acceptedCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  {stats.sentCount}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  {stats.declinedCount}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/quotes/new"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 text-xs font-medium transition-colors border border-emerald-900/50"
          >
            <FileText className="w-3.5 h-3.5" />
            Neues Angebot erstellen
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
