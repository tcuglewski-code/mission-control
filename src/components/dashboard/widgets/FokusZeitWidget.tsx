"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { WidgetShell } from "./WidgetShell";

interface PomodoroStats {
  count: number;
  totalMinutes: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

export function FokusZeitWidget() {
  const [stats, setStats] = useState<PomodoroStats>({
    count: 0,
    totalMinutes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pomodoro?range=today")
      .then((r) => r.json())
      .then((data) => {
        setStats({ count: data.count ?? 0, totalMinutes: data.totalMinutes ?? 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell
      title="Fokus-Zeit Heute"
      icon={<Timer className="w-4 h-4 text-emerald-400" />}
      href="/pomodoro"
      linkLabel="Zum Timer"
      badge={
        stats.totalMinutes > 0 ? (
          <span className="text-xs font-semibold text-emerald-400">
            {formatMinutes(stats.totalMinutes)}
          </span>
        ) : undefined
      }
    >
      <div className="px-5 py-6 flex flex-col items-center justify-center gap-4">
        {loading ? (
          <div className="text-zinc-600 text-sm">Lade...</div>
        ) : stats.count === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-2">🍅</div>
            <p className="text-zinc-500 text-sm">Noch kein Pomodoro heute</p>
            <p className="text-zinc-600 text-xs mt-1">
              Starte einen Timer um fokussiert zu arbeiten
            </p>
          </div>
        ) : (
          <div className="text-center w-full">
            <div className="flex items-center justify-around">
              <div>
                <p className="text-3xl font-bold text-white">{stats.count}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {stats.count === 1 ? "Pomodoro" : "Pomodoros"}
                </p>
              </div>
              <div className="w-px h-12 bg-[#2a2a2a]" />
              <div>
                <p className="text-3xl font-bold text-emerald-400">
                  {formatMinutes(stats.totalMinutes)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">fokussiert</p>
              </div>
            </div>
            {/* Tomaten-Visualisierung */}
            <div className="flex flex-wrap gap-1 justify-center mt-4">
              {Array.from({ length: Math.min(stats.count, 12) }).map((_, i) => (
                <span key={i} className="text-lg" title="Pomodoro abgeschlossen">
                  🍅
                </span>
              ))}
              {stats.count > 12 && (
                <span className="text-sm text-zinc-500 self-center">
                  +{stats.count - 12}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
