"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WidgetShell } from "./WidgetShell";
import { Building2, TrendingUp, UserPlus, Loader2 } from "lucide-react";

interface ClientStats {
  top3: { id: string; name: string; umsatz: number }[];
  neukundenMonat: number;
  gesamt: number;
}

function formatEur(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function KundenWidget() {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell
      title="Kunden"
      icon={<Building2 className="w-4 h-4 text-emerald-400" />}
      href="/clients"
      linkLabel="Alle"
    >
      {loading ? (
        <div className="flex items-center justify-center py-6 text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : !stats ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Keine Daten</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* KPI-Zeile */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-bold text-white">{stats.gesamt}</div>
              <div className="text-xs text-zinc-500 leading-tight">Kunden gesamt</div>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-bold text-white">{stats.neukundenMonat}</div>
              <div className="text-xs text-zinc-500 leading-tight">Neukunden / Monat</div>
            </div>
          </div>

          {/* Top 3 nach Umsatz */}
          {stats.top3.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Top 3 Kunden (Umsatz)
                </span>
              </div>
              <div className="space-y-2">
                {stats.top3.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="flex items-center gap-3 group hover:bg-[#252525] rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-zinc-300 group-hover:text-white truncate transition-colors">
                      {c.name}
                    </span>
                    <span className="text-xs font-medium text-emerald-400">
                      {c.umsatz > 0 ? formatEur(c.umsatz) : "–"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {stats.top3.length === 0 && (
            <div className="text-center py-3 text-xs text-zinc-600">
              Noch keine Umsätze erfasst
            </div>
          )}

          {/* CTA */}
          <Link
            href="/clients"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 text-xs font-medium transition-colors border border-emerald-900/50"
          >
            <Building2 className="w-3.5 h-3.5" />
            Kunden verwalten
          </Link>
        </div>
      )}
    </WidgetShell>
  );
}
