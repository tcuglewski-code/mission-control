"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Star,
  StarOff,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Flame,
  Target,
  CalendarDays,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  storyPoints?: number | null;
  project?: { id: string; name: string; color: string } | null;
  timeEntries?: Array<{ id?: string }>;
}

interface RunningTimer {
  id: string;
  startTime: string;
  task: { id: string; title: string };
}

interface MeinTagClientProps {
  tasks: Task[];
  doneTodayCount: number;
  totalTasks: number;
  focusTaskIds: string[];
  dayNote: string;
  runningTimer: RunningTimer | null;
  todayStr: string;
  userId: string;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-zinc-400 bg-zinc-700/30 border-zinc-700/30",
};
const PRIORITY_LABEL: Record<string, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

const MOTIVATIONS = [
  "Weiter so — du machst das großartig! 🌱",
  "Schritt für Schritt zum Ziel. 🎯",
  "Fokus ist deine Superkraft. ⚡",
  "Jede erledigte Task bringt dich weiter. 🚀",
  "Der Wald wächst — und du auch. 🌲",
  "Produktivität ist kein Sprint, sondern ein Marathon. 🏃",
  "Kleine Fortschritte summieren sich. ✨",
  "Du schaffst das — einen Task nach dem anderen. 💪",
];

function getMotivation(done: number, total: number): string {
  if (total === 0) return "Kein Task für heute — genieße den Tag! ☀️";
  const pct = done / total;
  if (pct === 1) return "Alle Tasks erledigt! Du bist ein Champion! 🏆";
  if (pct >= 0.75) return "Fast geschafft — noch ein letzter Schritt! 🔥";
  if (pct >= 0.5) return "Halbzeit! Du bist auf einem guten Weg! 💪";
  const idx = Math.floor((done + total) % MOTIVATIONS.length);
  return MOTIVATIONS[idx];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function MeinTagClient({
  tasks,
  doneTodayCount,
  totalTasks,
  focusTaskIds: initialFocusIds,
  dayNote: initialNote,
  runningTimer: initialTimer,
  todayStr,
  userId,
}: MeinTagClientProps) {
  const [focusIds, setFocusIds] = useState<string[]>(initialFocusIds);
  const [note, setNote] = useState(initialNote);
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(initialTimer);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [savingNote, setSavingNote] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>(tasks);
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (runningTimer) {
      const start = new Date(runningTimer.startTime).getTime();
      const update = () => setTimerSeconds(Math.floor((Date.now() - start) / 1000));
      update();
      timerIntervalRef.current = setInterval(update, 1000);
    } else {
      setTimerSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [runningTimer]);

  // Notiz auto-save
  const saveNote = useCallback(
    (content: string) => {
      setSavingNote(true);
      fetch("/api/my-day/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr, content }),
      }).finally(() => setSavingNote(false));
    },
    [todayStr]
  );

  const handleNoteChange = (val: string) => {
    setNote(val);
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    noteDebounceRef.current = setTimeout(() => saveNote(val), 500);
  };

  // Toggle Fokus
  const toggleFocus = async (taskId: string) => {
    const isFocused = focusIds.includes(taskId);
    if (!isFocused && focusIds.length >= 3) {
      alert("Maximal 3 Fokus-Tasks pro Tag erlaubt.");
      return;
    }
    const action = isFocused ? "remove" : "add";
    const res = await fetch("/api/my-day/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, date: todayStr, action }),
    });
    if (res.ok) {
      setFocusIds((prev) =>
        isFocused ? prev.filter((id) => id !== taskId) : [...prev, taskId]
      );
    }
  };

  // Schnell-Timer
  const startTimer = async (taskId: string) => {
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (res.ok) {
      const entry = await res.json();
      const task = taskList.find((t) => t.id === taskId);
      setRunningTimer({
        id: entry.id,
        startTime: entry.startTime,
        task: { id: taskId, title: task?.title ?? "" },
      });
    }
  };

  const stopTimer = async () => {
    if (!runningTimer) return;
    const res = await fetch(`/api/time-entries/${runningTimer.id}/stop`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setRunningTimer(null);
    }
  };

  // Mark task done
  const markDone = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (res.ok) {
      setTaskList((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const progressPct = totalTasks > 0 ? Math.round((doneTodayCount / totalTasks) * 100) : 0;
  const focusTasks = taskList.filter((t) => focusIds.includes(t.id));
  const otherTasks = taskList
    .filter((t) => !focusIds.includes(t.id))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));

  // Geplante Zeit (storyPoints × 30min als Schätzung)
  const estimatedMinutes = taskList.reduce((sum, t) => sum + (t.storyPoints ? t.storyPoints * 30 : 30), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Fortschritts-Block */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-semibold">Tagesfortschritt</h2>
          </div>
          <span className="text-2xl font-bold text-emerald-400">{progressPct}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            <span className="text-white font-medium">{doneTodayCount}</span> von{" "}
            <span className="text-white font-medium">{totalTasks}</span> Tasks erledigt
          </span>
          <span className="text-zinc-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ~{Math.round(estimatedMinutes / 60 * 10) / 10}h geplant
          </span>
        </div>

        {/* Motivations-Spruch */}
        <p className="text-sm text-zinc-400 italic border-t border-[#2a2a2a] pt-3">
          {getMotivation(doneTodayCount, totalTasks)}
        </p>
      </div>

      {/* Laufender Timer Banner */}
      {runningTimer && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <div>
              <p className="text-sm text-white font-medium">Timer läuft: {runningTimer.task.title}</p>
              <p className="text-xs text-blue-300 font-mono">{formatDuration(timerSeconds)}</p>
            </div>
          </div>
          <button
            onClick={stopTimer}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Stoppen
          </button>
        </div>
      )}

      {/* Heutiger Fokus */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-white font-semibold">Heutiger Fokus</h2>
            <span className="text-xs text-zinc-500 bg-[#222] px-2 py-0.5 rounded-full">
              {focusIds.length}/3
            </span>
          </div>
          <span className="text-xs text-zinc-600">Klicke ⭐ um Tasks zu fokussieren</span>
        </div>

        {focusTasks.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-dashed border-[#333] rounded-xl p-6 text-center">
            <Star className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Noch keine Fokus-Tasks ausgewählt.</p>
            <p className="text-zinc-600 text-xs mt-1">Klicke auf ⭐ bei einem Task unten.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isFocus={true}
                isRunning={runningTimer?.task.id === task.id}
                onToggleFocus={toggleFocus}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                onMarkDone={markDone}
                highlight
              />
            ))}
          </div>
        )}
      </div>

      {/* Alle heutigen Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold">Heutige Tasks</h2>
            <span className="text-xs text-zinc-500 bg-[#222] px-2 py-0.5 rounded-full">
              {taskList.length}
            </span>
          </div>
          <Link href="/tasks" className="text-xs text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
            Alle Tasks
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {otherTasks.length === 0 && taskList.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-white font-medium">Alle Tasks erledigt!</p>
            <p className="text-zinc-500 text-sm mt-1">Großartige Arbeit für heute. 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {otherTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isFocus={false}
                isRunning={runningTimer?.task.id === task.id}
                onToggleFocus={toggleFocus}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                onMarkDone={markDone}
              />
            ))}
          </div>
        )}
      </div>

      {/* Persönliche Notizen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="text-lg">📝</span> Tagesnotizen
          </h2>
          {savingNote && (
            <span className="text-xs text-zinc-500 animate-pulse">Speichert…</span>
          )}
          {!savingNote && note.length > 0 && (
            <span className="text-xs text-emerald-500">✓ Gespeichert</span>
          )}
        </div>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Notizen für heute — Gedanken, Ideen, Erledigtes…"
          className="w-full min-h-[140px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-sm text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Task Row Komponente ──────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  isFocus: boolean;
  isRunning: boolean;
  onToggleFocus: (id: string) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkDone: (id: string) => void;
  highlight?: boolean;
}

function TaskRow({
  task,
  isFocus,
  isRunning,
  onToggleFocus,
  onStartTimer,
  onStopTimer,
  onMarkDone,
  highlight,
}: TaskRowProps) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        highlight
          ? "bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10"
          : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
      }`}
    >
      {/* Erledigt Toggle */}
      <button
        onClick={() => onMarkDone(task.id)}
        className="text-zinc-600 hover:text-emerald-400 transition-colors shrink-0"
        title="Als erledigt markieren"
      >
        <Circle className="w-5 h-5" />
      </button>

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        <Link
          href="/tasks"
          className="text-sm text-white hover:text-emerald-400 transition-colors line-clamp-1 font-medium"
        >
          {task.title}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLOR[task.priority] ?? ""}`}
          >
            {PRIORITY_LABEL[task.priority] ?? task.priority}
          </span>
          {task.dueDate && (
            <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-zinc-600"}`}>
              {isOverdue ? "⚠️ " : ""}
              {new Date(task.dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
      </div>

      {/* Timer Button */}
      {isRunning ? (
        <button
          onClick={onStopTimer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs transition-colors shrink-0"
          title="Timer stoppen"
        >
          <Square className="w-3 h-3" />
          Stopp
        </button>
      ) : (
        <button
          onClick={() => onStartTimer(task.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs transition-colors shrink-0"
          title="Timer starten"
        >
          <Play className="w-3 h-3" />
          Timer
        </button>
      )}

      {/* Fokus Toggle */}
      <button
        onClick={() => onToggleFocus(task.id)}
        className={`shrink-0 transition-colors ${
          isFocus ? "text-orange-400 hover:text-zinc-500" : "text-zinc-600 hover:text-orange-400"
        }`}
        title={isFocus ? "Aus Fokus entfernen" : "Zum Fokus hinzufügen"}
      >
        {isFocus ? <Star className="w-4 h-4 fill-orange-400" /> : <Star className="w-4 h-4" />}
      </button>
    </div>
  );
}
