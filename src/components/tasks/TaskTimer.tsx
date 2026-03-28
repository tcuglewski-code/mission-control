"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Square, Clock } from "lucide-react";

interface TimeEntry {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  description: string | null;
}

interface TaskTimerProps {
  taskId: string;
  taskTitle?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function TaskTimer({ taskId }: TaskTimerProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/time-entries?taskId=${taskId}`);
      if (!res.ok) return;
      const data: TimeEntry[] = await res.json();
      setEntries(data);
      const running = data.find((e) => !e.endTime) ?? null;
      setActiveEntry(running);
      if (running) {
        const secs = Math.floor((Date.now() - new Date(running.startTime).getTime()) / 1000);
        setElapsed(secs);
      }
    } catch {
      // ignore
    }
  }, [taskId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Live-Ticker
  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        const entry: TimeEntry = await res.json();
        setActiveEntry(entry);
        setElapsed(0);
        setEntries((prev) => [entry, ...prev]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/time-entries/${activeEntry.id}/stop`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const updated: TimeEntry = await res.json();
        setActiveEntry(null);
        setElapsed(0);
        setEntries((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const completedEntries = entries.filter((e) => e.endTime);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Timer-Button */}
      <div className="flex items-center gap-3">
        {activeEntry ? (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <span className="font-mono text-sm tabular-nums">{formatDuration(elapsed)}</span>
            <Square className="w-3 h-3 fill-current" />
            <span>Stopp</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Timer starten</span>
          </button>
        )}

        {/* Gesamtzeit */}
        {(totalMinutes > 0 || activeEntry) && (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>
              Zeiteinträge ({completedEntries.length}{activeEntry ? "+1 aktiv" : ""}{totalMinutes > 0 ? `, ${formatMinutes(totalMinutes)} gesamt` : ""})
            </span>
          </div>
        )}
      </div>

      {/* Eintrags-Liste */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-2 py-1 rounded bg-[#1a1a1a] border border-[#252525] text-xs"
            >
              <div className="flex items-center gap-2">
                {!entry.endTime ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                )}
                <span className="text-zinc-400">
                  {new Date(entry.startTime).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}{" "}
                  {new Date(entry.startTime).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {entry.description && (
                  <span className="text-zinc-600 truncate max-w-[120px]">{entry.description}</span>
                )}
              </div>
              <span className="text-zinc-300 font-mono tabular-nums">
                {entry.endTime
                  ? formatMinutes(entry.duration ?? 0)
                  : <span className="text-red-400">läuft…</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
