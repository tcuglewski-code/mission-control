"use client";

import { useState, useCallback } from "react";
import { Timer, MoreHorizontal, Plus, RefreshCw, Trash2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface CronJob {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  scheduleHuman: string | null;
  type: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  payload: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialJobs: CronJob[];
}

function formatNextRun(nextRun: string | null, status: string): string {
  if (status === "inactive") return "Inaktiv";
  if (!nextRun) return "—";
  const date = new Date(nextRun);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return "In Kürze";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return "Jetzt";
  if (minutes < 60) return `in ~${minutes} Min`;
  if (hours < 24) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date < tomorrow) {
      return `heute ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return `in ~${hours} Std`;
  }
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatLastRun(lastRun: string | null): string {
  if (!lastRun) return "—";
  const date = new Date(lastRun);
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function CronJobsClient({ initialJobs }: Props) {
  const [jobs, setJobs] = useState<CronJob[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cronjobs");
      const data = await res.json();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  async function toggleJob(id: string, currentStatus: string) {
    setTogglingId(id);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/cronjobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm("Cron Job wirklich löschen?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/cronjobs/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } finally {
      setDeletingId(null);
      setOpenMenuId(null);
    }
  }

  const activeCount = jobs.filter((j) => j.status === "active").length;
  const inactiveCount = jobs.filter((j) => j.status === "inactive").length;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Timer className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Cron Jobs</h1>
              <p className="text-xs text-zinc-500">Automatisierte Aufgaben & Zeitpläne</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshJobs}
              disabled={loading}
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1e1e1e] transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Neuer Job</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 sm:gap-6 text-sm mb-6">
          <span className="text-emerald-400 font-medium">Aktiv ({activeCount})</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">Inaktiv ({inactiveCount})</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">Gesamt ({jobs.length})</span>
        </div>

        {/* Job List */}
        {jobs.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Timer className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Cron Jobs vorhanden</p>
            <p className="text-xs mt-1">Erstelle deinen ersten automatisierten Job</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isActive = job.status === "active";
              const isToggling = togglingId === job.id;

              return (
                <div
                  key={job.id}
                  className={cn(
                    "rounded-xl border p-4 sm:p-5 transition-all",
                    isActive
                      ? "bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/30"
                      : "bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Dot */}
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1",
                          isActive ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-white text-sm sm:text-base truncate">{job.name}</h3>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border shrink-0",
                                job.type === "system"
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              )}
                            >
                              {job.type === "system" ? "System" : "Custom"}
                            </span>
                          </div>

                          {job.scheduleHuman && (
                            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                              ⏰ {job.scheduleHuman}
                              <span className="text-zinc-600 ml-2">{job.schedule}</span>
                            </p>
                          )}

                          {job.description && (
                            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                              {job.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 flex-wrap">
                            {isActive && (
                              <span>
                                Nächster Lauf:{" "}
                                <span className="text-zinc-300">
                                  {formatNextRun(job.nextRun, job.status)}
                                </span>
                              </span>
                            )}
                            <span>
                              Letzter Lauf:{" "}
                              <span className="text-zinc-300">{formatLastRun(job.lastRun)}</span>
                            </span>
                            {!isActive && (
                              <span className="text-zinc-600 italic">Inaktiv — pausiert</span>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle */}
                          <button
                            onClick={() => toggleJob(job.id, job.status)}
                            disabled={isToggling}
                            className={cn(
                              "relative w-10 h-5 rounded-full transition-colors shrink-0",
                              isActive ? "bg-emerald-500" : "bg-zinc-700",
                              isToggling && "opacity-60 cursor-wait"
                            )}
                            title={isActive ? "Deaktivieren" : "Aktivieren"}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                                isActive ? "translate-x-5" : "translate-x-0.5"
                              )}
                            />
                          </button>

                          {/* Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === job.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-8 z-20 w-44 bg-[#1e1e1e] border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                                  <button
                                    onClick={() => {
                                      toggleJob(job.id, job.status);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                                  >
                                    {isActive ? (
                                      <><Pause className="w-3.5 h-3.5" /> Deaktivieren</>
                                    ) : (
                                      <><Play className="w-3.5 h-3.5" /> Aktivieren</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deleteJob(job.id)}
                                    disabled={deletingId === job.id}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {deletingId === job.id ? "Löschen..." : "Löschen"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
