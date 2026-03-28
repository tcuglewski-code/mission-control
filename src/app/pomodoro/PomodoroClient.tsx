"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  BellOff,
  Bell,
  Maximize,
  Minimize,
  Coffee,
  Focus,
  X,
  CheckCircle2,
  Clock,
  Timer,
  ListChecks,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: { id: string; name: string; color: string } | null;
}

interface PomodoroClientProps {
  initialTodayCount: number;
  initialWeekMinutes: number;
  tasks: Task[];
}

type Phase = "work" | "short_break" | "long_break";

const PHASE_LABELS: Record<Phase, string> = {
  work: "Fokuszeit",
  short_break: "Kurze Pause",
  long_break: "Lange Pause",
};

const PHASE_COLORS: Record<Phase, string> = {
  work: "#22c55e",
  short_break: "#3b82f6",
  long_break: "#a855f7",
};

// ─── Einstellungen ─────────────────────────────────────────────────────────────

interface Config {
  workMin: 15 | 25 | 50;
  shortBreakMin: 5 | 10;
  longBreakMin: 15 | 20 | 30;
  pomodorosBeforeLong: number;
}

const DEFAULT_CONFIG: Config = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  pomodorosBeforeLong: 4,
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Einfacher 440Hz Beep-Ton via Web Audio API
function playBeep(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 440;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function PomodoroClient({
  initialTodayCount,
  initialWeekMinutes,
  tasks,
}: PomodoroClientProps) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [phase, setPhase] = useState<Phase>("work");
  const [pomodoroCount, setPomodoroCount] = useState(0); // Zähler in dieser Session
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_CONFIG.workMin * 60);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [todayCount, setTodayCount] = useState(initialTodayCount);
  const [weekMinutes, setWeekMinutes] = useState(initialWeekMinutes);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSeconds =
    phase === "work"
      ? config.workMin * 60
      : phase === "short_break"
      ? config.shortBreakMin * 60
      : config.longBreakMin * 60;

  const progress = 1 - secondsLeft / totalSeconds; // 0 → 1

  // Radius und Umfang des SVG-Kreises
  const R = 110;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - progress);

  // ─── Timer-Logik ──────────────────────────────────────────────────────────

  const handlePhaseComplete = useCallback(
    async (completedPhase: Phase) => {
      setRunning(false);

      // Ton abspielen
      if (soundOn) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        playBeep(audioCtxRef.current);
      }

      // Browser-Notification
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(
            completedPhase === "work"
              ? "🍅 Pomodoro abgeschlossen!"
              : "⏰ Pause vorbei — zurück an die Arbeit!",
            {
              body:
                completedPhase === "work"
                  ? "Gut gemacht! Mach eine kurze Pause."
                  : "Fokuszeit beginnt jetzt.",
              icon: "/favicon.ico",
            }
          );
        }
      }

      if (completedPhase === "work") {
        const newCount = pomodoroCount + 1;
        setPomodoroCount(newCount);

        // Pomodoro an API senden
        try {
          const duration =
            completedPhase === "work" ? config.workMin : config.shortBreakMin;
          await fetch("/api/pomodoro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: selectedTaskId,
              duration,
              type: "work",
            }),
          });
          setTodayCount((c) => c + 1);
          setWeekMinutes((m) => m + duration);
        } catch {
          // silently ignore
        }

        // Nächste Phase bestimmen
        if (newCount % config.pomodorosBeforeLong === 0) {
          setPhase("long_break");
          setSecondsLeft(config.longBreakMin * 60);
        } else {
          setPhase("short_break");
          setSecondsLeft(config.shortBreakMin * 60);
        }
      } else {
        setPhase("work");
        setSecondsLeft(config.workMin * 60);
      }
    },
    [
      soundOn,
      pomodoroCount,
      config,
      selectedTaskId,
    ]
  );

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            handlePhaseComplete(phase);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, handlePhaseComplete]);

  // Reset wenn Config sich ändert
  useEffect(() => {
    setRunning(false);
    setPhase("work");
    setPomodoroCount(0);
    setSecondsLeft(config.workMin * 60);
  }, [config]);

  // Notification-Permission anfordern
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Escape → Fokus-Modus beenden
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusMode(false);
        if (document.fullscreenElement) document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fullscreen-Change-Event
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (next && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (isFullscreen) {
      document.exitFullscreen();
    }
  };

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(
      phase === "work"
        ? config.workMin * 60
        : phase === "short_break"
        ? config.shortBreakMin * 60
        : config.longBreakMin * 60
    );
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const color = PHASE_COLORS[phase];

  // ─── Fokus-Modus-Overlay ──────────────────────────────────────────────────

  if (focusMode) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
      >
        {/* Oben: Task + Beenden-Button */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            {selectedTask ? (
              <div className="flex items-center gap-2">
                {selectedTask.project && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedTask.project.color }}
                  />
                )}
                <span className="text-white font-medium">
                  {selectedTask.title}
                </span>
              </div>
            ) : (
              <span className="text-zinc-500">Kein Task ausgewählt</span>
            )}
          </div>
          <button
            onClick={toggleFocusMode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1c1c1c] border border-[#333] text-zinc-300 hover:text-white hover:border-[#555] transition-all"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Fokus beenden</span>
          </button>
        </div>

        {/* Phase-Label */}
        <p className="text-zinc-400 text-lg mb-6">{PHASE_LABELS[phase]}</p>

        {/* SVG Timer */}
        <TimerSVG
          secondsLeft={secondsLeft}
          progress={progress}
          circumference={circumference}
          dashOffset={dashOffset}
          R={R}
          color={color}
          size={300}
        />

        {/* Steuerung */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={resetTimer}
            className="p-3 rounded-full bg-[#1c1c1c] border border-[#333] text-zinc-400 hover:text-white hover:border-[#555] transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            style={{ backgroundColor: color }}
            className="p-5 rounded-full text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            {running ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="p-3 rounded-full bg-[#1c1c1c] border border-[#333] text-zinc-400 hover:text-white hover:border-[#555] transition-all"
          >
            {soundOn ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Pomodoro-Dots */}
        <div className="flex gap-2 mt-6">
          {Array.from({ length: config.pomodorosBeforeLong }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  i < (pomodoroCount % config.pomodorosBeforeLong)
                    ? color
                    : "#333",
              }}
            />
          ))}
        </div>

        {/* ESC Hinweis */}
        <p className="absolute bottom-6 text-zinc-600 text-xs">
          ESC drücken um Fokus-Modus zu beenden
        </p>
      </div>
    );
  }

  // ─── Normaler Modus ───────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Statistiken oben */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          label="Heute abgeschlossen"
          value={`${todayCount} Pomodoros`}
          sub={`${todayCount * config.workMin} Min fokussiert`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-violet-400" />}
          label="Diese Woche"
          value={formatMinutes(weekMinutes)}
          sub="Fokuszeit insgesamt"
        />
        <StatCard
          icon={<Timer className="w-5 h-5 text-amber-400" />}
          label="Diese Session"
          value={`${pomodoroCount} Pomodoros`}
          sub={`${pomodoroCount * config.workMin} Min`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Hauptbereich */}
        <div className="lg:col-span-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 flex flex-col items-center">
          {/* Phase-Wechsler */}
          <div className="flex gap-2 mb-6">
            {(["work", "short_break", "long_break"] as Phase[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  if (running) return;
                  setPhase(p);
                  setSecondsLeft(
                    p === "work"
                      ? config.workMin * 60
                      : p === "short_break"
                      ? config.shortBreakMin * 60
                      : config.longBreakMin * 60
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  phase === p
                    ? "text-white border"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
                style={
                  phase === p
                    ? { borderColor: color, color, backgroundColor: `${color}15` }
                    : {}
                }
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>

          {/* SVG Timer */}
          <TimerSVG
            secondsLeft={secondsLeft}
            progress={progress}
            circumference={circumference}
            dashOffset={dashOffset}
            R={R}
            color={color}
            size={260}
          />

          {/* Pomodoro-Dots */}
          <div className="flex gap-2 mt-4 mb-6">
            {Array.from({ length: config.pomodorosBeforeLong }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i < (pomodoroCount % config.pomodorosBeforeLong)
                      ? color
                      : "#333",
                }}
              />
            ))}
          </div>

          {/* Steuerung */}
          <div className="flex items-center gap-3">
            <button
              onClick={resetTimer}
              title="Zurücksetzen"
              className="p-2.5 rounded-full bg-[#252525] border border-[#333] text-zinc-400 hover:text-white hover:border-[#555] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setRunning((r) => !r)}
              style={{ backgroundColor: color }}
              className="px-8 py-3 rounded-full text-white font-semibold flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
            >
              {running ? (
                <>
                  <Pause className="w-5 h-5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 ml-0.5" /> Starten
                </>
              )}
            </button>

            <button
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? "Ton deaktivieren" : "Ton aktivieren"}
              className="p-2.5 rounded-full bg-[#252525] border border-[#333] text-zinc-400 hover:text-white hover:border-[#555] transition-all"
            >
              {soundOn ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Aktions-Buttons unten */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] border border-[#333] text-xs text-zinc-400 hover:text-white hover:border-[#555] transition-all"
            >
              <Focus className="w-3.5 h-3.5" />
              Fokus-Modus
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] border border-[#333] text-xs text-zinc-400 hover:text-white hover:border-[#555] transition-all"
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
              {isFullscreen ? "Fenster" : "Vollbild"}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] border border-[#333] text-xs text-zinc-400 hover:text-white hover:border-[#555] transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Einstellungen
            </button>
          </div>
        </div>

        {/* Rechte Seite: Task-Auswahl */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              Aktueller Task
            </h3>
            <button
              onClick={() => setTaskPickerOpen((o) => !o)}
              className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              {selectedTask ? "Ändern" : "Auswählen"}
            </button>
          </div>

          {selectedTask ? (
            <div className="p-3 rounded-lg bg-[#252525] border border-[#333]">
              <div className="flex items-start gap-2">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{
                    backgroundColor:
                      selectedTask.project?.color ?? "#6b7280",
                  }}
                />
                <div>
                  <p className="text-sm text-white leading-snug">
                    {selectedTask.title}
                  </p>
                  {selectedTask.project && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedTask.project.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Auswahl aufheben
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#252525] border border-dashed border-[#333] text-center">
              <Coffee className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">
                Wähle einen Task aus, an dem du arbeiten möchtest
              </p>
            </div>
          )}

          {/* Task-Liste */}
          {taskPickerOpen && (
            <div className="flex-1 overflow-y-auto max-h-64 space-y-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">
                  Keine offenen Tasks
                </p>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setTaskPickerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      selectedTaskId === task.id
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-[#252525] border border-transparent hover:border-[#444] text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {task.project && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: task.project.color }}
                        />
                      )}
                      <span className="line-clamp-1">{task.title}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Heute Info */}
          <div className="mt-auto pt-4 border-t border-[#2a2a2a] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Heute:</span>
              <span className="text-emerald-400 font-medium">
                {todayCount} × 🍅
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Woche:</span>
              <span className="text-violet-400 font-medium">
                {formatMinutes(weekMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Einstellungs-Modal */}
      {settingsOpen && (
        <SettingsModal
          config={config}
          onSave={(c) => {
            setConfig(c);
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// ─── SVG Timer-Kreis ──────────────────────────────────────────────────────────

interface TimerSVGProps {
  secondsLeft: number;
  progress: number;
  circumference: number;
  dashOffset: number;
  R: number;
  color: string;
  size: number;
}

function TimerSVG({
  secondsLeft,
  circumference,
  dashOffset,
  R,
  color,
  size,
}: TimerSVGProps) {
  const center = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Hintergrundkreis */}
        <circle
          cx={center}
          cy={center}
          r={R}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="10"
        />
        {/* Fortschrittskreis */}
        <circle
          cx={center}
          cy={center}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {/* Zeit in der Mitte */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold text-white"
          style={{ fontSize: size * 0.14 }}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>
    </div>
  );
}

// ─── Stat-Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Einstellungs-Modal ───────────────────────────────────────────────────────

function SettingsModal({
  config,
  onSave,
  onClose,
}: {
  config: Config;
  onSave: (c: Config) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Config>({ ...config });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Timer-Einstellungen
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Fokuszeit (Minuten)
            </label>
            <div className="flex gap-2">
              {([15, 25, 50] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setDraft((d) => ({ ...d, workMin: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    draft.workMin === v
                      ? "bg-emerald-500 text-white"
                      : "bg-[#252525] border border-[#333] text-zinc-400 hover:border-[#555]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Kurze Pause (Minuten)
            </label>
            <div className="flex gap-2">
              {([5, 10] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setDraft((d) => ({ ...d, shortBreakMin: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    draft.shortBreakMin === v
                      ? "bg-blue-500 text-white"
                      : "bg-[#252525] border border-[#333] text-zinc-400 hover:border-[#555]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Lange Pause (Minuten)
            </label>
            <div className="flex gap-2">
              {([15, 20, 30] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setDraft((d) => ({ ...d, longBreakMin: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    draft.longBreakMin === v
                      ? "bg-violet-500 text-white"
                      : "bg-[#252525] border border-[#333] text-zinc-400 hover:border-[#555]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Pomodoros bis Langpause
            </label>
            <div className="flex gap-2">
              {[3, 4, 5, 6].map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    setDraft((d) => ({ ...d, pomodorosBeforeLong: v }))
                  }
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    draft.pomodorosBeforeLong === v
                      ? "bg-amber-500 text-white"
                      : "bg-[#252525] border border-[#333] text-zinc-400 hover:border-[#555]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSave(draft)}
          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
