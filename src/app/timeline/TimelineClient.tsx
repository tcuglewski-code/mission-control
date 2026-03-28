"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo
} from "react";
import {
  addDays, addWeeks, addMonths,
  startOfWeek, startOfMonth,
  endOfWeek, endOfMonth,
  format, differenceInDays, eachDayOfInterval, isWeekend,
  startOfDay, isSameDay, parseISO
} from "date-fns";
import { de } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut,
  GitBranch, AlertTriangle
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  project?: { id: string; name: string; color: string } | null;
  // Aus Abhängigkeits-API
  dependsOnIds?: string[];   // Diese Task braucht X
  blockedByIds?: string[];   // = dependsOnIds (alias)
  blockingIds?: string[];    // Diese Task blockiert X
}

interface Dependency {
  taskId: string;      // Nachfolger
  dependsOnId: string; // Vorgänger
}

// ─── Farb-Kodierung ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  todo: "#71717a",
  in_progress: "#3b82f6",
  done: "#10b981",
  blocked: "#ef4444",
  review: "#f59e0b",
  backlog: "#6366f1",
  in_review: "#f59e0b",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Fertig",
  blocked: "Blockiert",
  review: "Review",
  backlog: "Backlog",
  in_review: "In Prüfung",
};

// ─── Zoom-Modi ────────────────────────────────────────────────────────────────

type ZoomMode = "tage" | "wochen" | "monate";

const ZOOM_CONFIG: Record<ZoomMode, { label: string; dayWidth: number }> = {
  tage:   { label: "Tage",   dayWidth: 40 },
  wochen: { label: "Wochen", dayWidth: 24 },
  monate: { label: "Monate", dayWidth: 10 },
};

function getZoomRange(mode: ZoomMode, anchor: Date): { start: Date; end: Date } {
  switch (mode) {
    case "tage":
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(anchor, 3), { weekStartsOn: 1 }),
      };
    case "wochen":
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(addMonths(anchor, 2)),
      };
    case "monate":
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(addMonths(anchor, 5)),
      };
  }
}

// ─── Kritischer Pfad ──────────────────────────────────────────────────────────

function computeCriticalPath(tasks: GanttTask[]): Set<string> {
  const taskMap = new Map<string, GanttTask>(tasks.map((t) => [t.id, t]));

  // Dauer eines Tasks in Tagen
  function taskDuration(task: GanttTask): number {
    if (!task.startDate && !task.dueDate) return 1;
    const start = task.startDate
      ? startOfDay(parseISO(task.startDate))
      : startOfDay(parseISO(task.dueDate!));
    const end = task.dueDate
      ? startOfDay(parseISO(task.dueDate))
      : startOfDay(parseISO(task.startDate!));
    return Math.max(differenceInDays(end, start) + 1, 1);
  }

  // Memo: frühestmögliche Fertigstellung (in Tagen ab Projektstart)
  const memo = new Map<string, number>();

  function earliestFinish(taskId: string, visited = new Set<string>()): number {
    if (memo.has(taskId)) return memo.get(taskId)!;
    if (visited.has(taskId)) return 0; // Zirkel abbrechen
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return 0;

    const preds = task.dependsOnIds ?? [];
    const predMax = preds.length > 0
      ? Math.max(...preds.map((id) => earliestFinish(id, new Set(visited))))
      : 0;

    const result = predMax + taskDuration(task);
    memo.set(taskId, result);
    return result;
  }

  // Berechne für alle Tasks
  for (const t of tasks) earliestFinish(t.id);

  if (memo.size === 0) return new Set();

  // Maximales Ende = Projektende
  const maxFinish = Math.max(...Array.from(memo.values()));

  // Kritische Tasks: deren earliestFinish == maxFinish
  // Oder auf dem Pfad zum maximalen Ende
  const criticalSet = new Set<string>();

  function markCritical(taskId: string) {
    if (criticalSet.has(taskId)) return;
    const task = taskMap.get(taskId);
    if (!task) return;
    criticalSet.add(taskId);

    const preds = task.dependsOnIds ?? [];
    const dur = taskDuration(task);

    for (const predId of preds) {
      const predFinish = memo.get(predId) ?? 0;
      const myFinish = memo.get(taskId) ?? 0;
      if (myFinish - predFinish === dur) {
        markCritical(predId);
      }
    }
  }

  // Finde alle Tasks die am Ende des kritischen Pfads stehen
  for (const [id, finish] of memo.entries()) {
    if (finish === maxFinish) markCritical(id);
  }

  return criticalSet;
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 230;
const MIN_BAR_WIDTH = 6;
const HEADER_HEIGHT = 52; // Monate + Tage

export function TimelineClient() {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ZoomMode>("wochen");
  const [anchor, setAnchor] = useState(new Date());
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showDeps, setShowDeps] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ganttAreaRef = useRef<HTMLDivElement>(null);

  // Drag-State
  const dragRef = useRef<{
    taskId: string;
    mode: "move" | "resize";
    startX: number;
    originalStart: Date | null;
    originalEnd: Date | null;
  } | null>(null);

  const dayWidth = ZOOM_CONFIG[zoom].dayWidth;

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("projectId", filterProject);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Tasks", err);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus]);

  const fetchDependencies = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/dependencies?all=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDependencies(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDependencies();
  }, [fetchTasks, fetchDependencies]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
  }, []);

  // Tasks mit Abhängigkeits-Informationen anreichern
  const enrichedTasks = useMemo((): GanttTask[] => {
    const depMap = new Map<string, string[]>(); // taskId → [dependsOnId, ...]
    const blockMap = new Map<string, string[]>(); // dependsOnId → [taskId, ...]

    for (const dep of dependencies) {
      if (!depMap.has(dep.taskId)) depMap.set(dep.taskId, []);
      depMap.get(dep.taskId)!.push(dep.dependsOnId);

      if (!blockMap.has(dep.dependsOnId)) blockMap.set(dep.dependsOnId, []);
      blockMap.get(dep.dependsOnId)!.push(dep.taskId);
    }

    return tasks.map((t) => ({
      ...t,
      dependsOnIds: depMap.get(t.id) ?? [],
      blockingIds: blockMap.get(t.id) ?? [],
    }));
  }, [tasks, dependencies]);

  // Kritischer Pfad
  const criticalSet = useMemo(
    () => computeCriticalPath(enrichedTasks),
    [enrichedTasks]
  );

  // Tasks mit Datum
  const tasksWithDates = enrichedTasks.filter((t) => t.startDate || t.dueDate);
  const tasksWithoutDates = enrichedTasks.filter((t) => !t.startDate && !t.dueDate);

  const { start: rangeStart, end: rangeEnd } = getZoomRange(zoom, anchor);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const totalDays = days.length;
  const totalWidth = dayWidth * totalDays;
  const today = startOfDay(new Date());

  // Navigation
  const navigate = (dir: "prev" | "next") => {
    setAnchor((prev) => {
      const d = dir === "prev" ? -1 : 1;
      if (zoom === "tage") return addWeeks(prev, d * 2);
      if (zoom === "wochen") return addMonths(prev, d * 2);
      return addMonths(prev, d * 3);
    });
  };

  const goToday = () => {
    setAnchor(new Date());
    // Scrolle zur Heute-Linie
    setTimeout(() => {
      if (scrollRef.current) {
        const todayOffset = differenceInDays(today, rangeStart);
        scrollRef.current.scrollLeft = LABEL_WIDTH + todayOffset * dayWidth - 200;
      }
    }, 50);
  };

  // Balkenposition berechnen
  function barProps(task: GanttTask) {
    const taskStart = task.startDate
      ? startOfDay(parseISO(task.startDate))
      : task.dueDate ? startOfDay(parseISO(task.dueDate)) : null;
    const taskEnd = task.dueDate
      ? startOfDay(parseISO(task.dueDate))
      : task.startDate ? startOfDay(parseISO(task.startDate)) : null;

    if (!taskStart || !taskEnd) return null;

    const startOffset = differenceInDays(taskStart, rangeStart);
    const durationDays = Math.max(differenceInDays(taskEnd, taskStart) + 1, 1);
    const left = startOffset * dayWidth;
    const width = Math.max(durationDays * dayWidth - 2, MIN_BAR_WIDTH);
    return { left, width, startOffset, durationDays, taskStart, taskEnd };
  }

  // Monats-Trennlinien
  const monthGroups: { label: string; days: number }[] = [];
  let currentMonth = "";
  let count = 0;
  days.forEach((day) => {
    const m = format(day, zoom === "monate" ? "MMM yy" : "MMMM yyyy", { locale: de });
    if (m !== currentMonth) {
      if (currentMonth) monthGroups.push({ label: currentMonth, days: count });
      currentMonth = m;
      count = 1;
    } else {
      count++;
    }
  });
  if (currentMonth) monthGroups.push({ label: currentMonth, days: count });

  // ─── Drag Handler ────────────────────────────────────────────────────────────

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, task: GanttTask, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();

      const taskStart = task.startDate ? parseISO(task.startDate) : null;
      const taskEnd = task.dueDate ? parseISO(task.dueDate) : null;

      dragRef.current = {
        taskId: task.id,
        mode,
        startX: e.clientX,
        originalStart: taskStart,
        originalEnd: taskEnd,
      };
    },
    []
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { taskId, mode, startX, originalStart, originalEnd } = dragRef.current;
      const deltaX = e.clientX - startX;
      const deltaDays = Math.round(deltaX / dayWidth);
      if (deltaDays === 0) return;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          if (mode === "move") {
            const newStart = originalStart
              ? format(addDays(originalStart, deltaDays), "yyyy-MM-dd")
              : t.startDate;
            const newEnd = originalEnd
              ? format(addDays(originalEnd, deltaDays), "yyyy-MM-dd")
              : t.dueDate;
            return { ...t, startDate: newStart, dueDate: newEnd };
          } else {
            // resize: nur Ende verschieben
            const newEnd = originalEnd
              ? format(addDays(originalEnd, deltaDays), "yyyy-MM-dd")
              : t.dueDate;
            return { ...t, dueDate: newEnd };
          }
        })
      );
    };

    const onMouseUp = async () => {
      if (!dragRef.current) return;
      const { taskId, mode, originalStart, originalEnd } = dragRef.current;
      dragRef.current = null;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // API-Update
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: task.startDate || null,
            dueDate: task.dueDate || null,
          }),
        });
      } catch {
        // Bei Fehler: Revert
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              startDate: originalStart ? format(originalStart, "yyyy-MM-dd") : t.startDate,
              dueDate: originalEnd ? format(originalEnd, "yyyy-MM-dd") : t.dueDate,
            };
          })
        );
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dayWidth, tasks]);

  // ─── SVG Pfeile ───────────────────────────────────────────────────────────────

  const dependencyArrows = useMemo(() => {
    if (!showDeps) return [];
    const arrows: {
      key: string;
      x1: number; y1: number;
      x2: number; y2: number;
      isCritical: boolean;
      path: string;
    }[] = [];

    const taskIndexMap = new Map<string, number>(
      tasksWithDates.map((t, i) => [t.id, i])
    );

    for (const dep of dependencies) {
      const fromTask = tasksWithDates.find((t) => t.id === dep.dependsOnId);
      const toTask = tasksWithDates.find((t) => t.id === dep.taskId);
      if (!fromTask || !toTask) continue;

      const fromBar = barProps(fromTask);
      const toBar = barProps(toTask);
      if (!fromBar || !toBar) continue;

      const fromIndex = taskIndexMap.get(dep.dependsOnId) ?? 0;
      const toIndex = taskIndexMap.get(dep.taskId) ?? 0;

      // Y-Position: Mitte der Zeile
      const y1 = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const y2 = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      // X-Position: Ende Vorgänger → Anfang Nachfolger
      const x1 = fromBar.left + fromBar.width;
      const x2 = toBar.left;

      // Kurvenweg (bezier)
      const midX = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

      const isCritical =
        criticalSet.has(dep.dependsOnId) && criticalSet.has(dep.taskId);

      arrows.push({ key: `${dep.dependsOnId}-${dep.taskId}`, x1, y1, x2, y2, isCritical, path });
    }

    return arrows;
  }, [dependencies, tasksWithDates, barProps, showDeps, criticalSet]);

  // ─── Mini-Map ──────────────────────────────────────────────────────────────

  const MINIMAP_HEIGHT = 50;
  const MINIMAP_BAR_HEIGHT = 3;

  const minimapRef = useRef<HTMLDivElement>(null);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scale = (totalWidth + LABEL_WIDTH) / rect.width;
    scrollRef.current.scrollLeft = clickX * scale - scrollRef.current.clientWidth / 2;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  // SVG-Viewbox-Höhe (Gantt-Bereich)
  const svgHeight = tasksWithDates.length * ROW_HEIGHT;
  const todayOffset = differenceInDays(today, rangeStart);

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]" style={{ userSelect: "none" }}>
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2a2a] shrink-0 flex-wrap">
        <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold text-white">Timeline</span>
        <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded-full">
          {tasksWithDates.length} Tasks
        </span>
        {criticalSet.size > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            {criticalSet.size} kritische Tasks
          </span>
        )}

        <div className="flex-1 min-w-[40px]" />

        {/* Filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="">Alle Status</option>
          <option value="todo">Offen</option>
          <option value="in_progress">In Arbeit</option>
          <option value="done">Fertig</option>
          <option value="blocked">Blockiert</option>
        </select>

        {/* Abhängigkeits-Toggle */}
        <button
          onClick={() => setShowDeps((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
            showDeps
              ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
              : "border-[#2a2a2a] text-zinc-500 hover:text-white"
          }`}
          title="Abhängigkeitspfeile"
        >
          <GitBranch className="w-3 h-3" />
          Abhängigkeiten
        </button>

        {/* Zoom */}
        <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
          {(["tage", "wochen", "monate"] as ZoomMode[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                zoom === z
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#252525]"
              }`}
            >
              {ZOOM_CONFIG[z].label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <button
          onClick={goToday}
          className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded border border-[#2a2a2a] transition-colors"
        >
          Heute
        </button>
        <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
          <button onClick={() => navigate("prev")} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525]">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate("next")} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525]">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Legende ─── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b border-[#2a2a2a] shrink-0 flex-wrap">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color + "80", border: `1px solid ${color}` }} />
            {STATUS_LABEL[status] ?? status}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] text-zinc-500 ml-2">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-red-500" />
          Kritischer Pfad
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="inline-block w-5 h-px border-t border-dashed border-zinc-500" />
          Abhängigkeit
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="inline-block w-5 h-px border-t-2 border-red-500" />
          Kritisch
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          Lade Timeline...
        </div>
      ) : (
        <>
          {/* ─── Gantt-Bereich ─── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto" ref={scrollRef}>
              <div style={{ minWidth: LABEL_WIDTH + totalWidth }}>

                {/* Header */}
                <div className="flex sticky top-0 z-20 bg-[#0f0f0f] border-b border-[#2a2a2a]">
                  <div className="shrink-0 border-r border-[#2a2a2a] bg-[#161616]" style={{ width: LABEL_WIDTH }} />
                  <div className="relative" style={{ width: totalWidth }}>
                    {/* Monats-Zeile */}
                    <div className="flex border-b border-[#2a2a2a] h-6">
                      {monthGroups.map((g, i) => (
                        <div
                          key={i}
                          className="border-r border-[#2a2a2a] flex items-center px-2 overflow-hidden"
                          style={{ width: g.days * dayWidth }}
                        >
                          <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap truncate">
                            {g.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Tages-Zeile */}
                    {zoom !== "monate" && (
                      <div className="flex h-6">
                        {days.map((day, i) => (
                          <div
                            key={i}
                            className={`border-r border-[#1e1e1e] flex items-center justify-center ${
                              isWeekend(day) ? "bg-[#1a1a1a]" : ""
                            } ${isSameDay(day, today) ? "bg-red-500/10" : ""}`}
                            style={{ width: dayWidth, minWidth: dayWidth }}
                          >
                            <span className={`text-[9px] ${isSameDay(day, today) ? "text-red-400 font-bold" : "text-zinc-600"}`}>
                              {format(day, zoom === "tage" ? "d" : "d")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Task-Zeilen + SVG-Overlay ─── */}
                <div className="relative" ref={ganttAreaRef}>
                  {/* Heute-Linie */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 z-20 pointer-events-none"
                      style={{
                        left: LABEL_WIDTH + todayOffset * dayWidth + dayWidth / 2,
                        width: 2,
                        background: "rgba(239,68,68,0.7)",
                      }}
                    >
                      <div className="absolute -top-0 -left-[3px] w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {tasksWithDates.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600 text-sm">
                      Keine Tasks mit Datum gefunden
                    </div>
                  ) : (
                    <>
                      {/* SVG Abhängigkeitspfeile */}
                      {showDeps && dependencyArrows.length > 0 && (
                        <svg
                          className="absolute top-0 left-0 pointer-events-none z-10"
                          style={{
                            width: LABEL_WIDTH + totalWidth,
                            height: svgHeight,
                            overflow: "visible",
                          }}
                        >
                          <defs>
                            <marker id="arrow-gray" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                              <path d="M 0 0 L 6 3 L 0 6 z" fill="#6b7280" />
                            </marker>
                            <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                              <path d="M 0 0 L 6 3 L 0 6 z" fill="#ef4444" />
                            </marker>
                          </defs>
                          {dependencyArrows.map((a) => (
                            <path
                              key={a.key}
                              d={a.path}
                              fill="none"
                              stroke={a.isCritical ? "#ef4444" : "#6b7280"}
                              strokeWidth={a.isCritical ? 1.5 : 1}
                              strokeDasharray={a.isCritical ? "none" : "4 3"}
                              markerEnd={a.isCritical ? "url(#arrow-red)" : "url(#arrow-gray)"}
                              style={{ transform: `translateX(${LABEL_WIDTH}px)` }}
                              opacity={0.7}
                            />
                          ))}
                        </svg>
                      )}

                      {/* Task-Zeilen */}
                      {tasksWithDates.map((task) => {
                        const bar = barProps(task);
                        const color = STATUS_COLOR[task.status] ?? "#71717a";
                        const isCritical = criticalSet.has(task.id);

                        return (
                          <div
                            key={task.id}
                            className="flex items-center border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors group"
                            style={{ height: ROW_HEIGHT }}
                          >
                            {/* Label */}
                            <div
                              className="shrink-0 border-r border-[#2a2a2a] px-3 flex items-center gap-2 overflow-hidden"
                              style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
                            >
                              {task.project && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project.color }} />
                              )}
                              <span className="text-xs text-zinc-300 truncate group-hover:text-white transition-colors flex-1">
                                {task.title}
                              </span>
                              {isCritical && (
                                <span title="Kritischer Pfad — Verzögerung wirkt sich auf Gesamtprojekt aus">
                                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                </span>
                              )}
                              {(task.dependsOnIds?.length ?? 0) > 0 && (
                                <span className="text-[9px] text-zinc-600 shrink-0" title={`Abhängig von ${task.dependsOnIds?.length} Tasks`}>
                                  ↑{task.dependsOnIds?.length}
                                </span>
                              )}
                              {(task.blockingIds?.length ?? 0) > 0 && (
                                <span className="text-[9px] text-zinc-600 shrink-0" title={`Blockiert ${task.blockingIds?.length} Tasks`}>
                                  ↓{task.blockingIds?.length}
                                </span>
                              )}
                            </div>

                            {/* Gantt-Zeile */}
                            <div className="relative" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                              {/* Wochenend-Streifen */}
                              {zoom === "tage" && days.map((day, i) =>
                                isWeekend(day) ? (
                                  <div
                                    key={i}
                                    className="absolute top-0 bottom-0 bg-[#1a1a1a] pointer-events-none"
                                    style={{ left: i * dayWidth, width: dayWidth }}
                                  />
                                ) : null
                              )}

                              {/* Balken */}
                              {bar && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 rounded cursor-grab active:cursor-grabbing select-none"
                                  style={{
                                    left: bar.left,
                                    width: bar.width,
                                    height: 22,
                                    backgroundColor: color + "40",
                                    border: isCritical
                                      ? `2px solid #ef4444`
                                      : `1px solid ${color}80`,
                                    boxShadow: isCritical ? "0 0 6px rgba(239,68,68,0.3)" : undefined,
                                  }}
                                  title={
                                    isCritical
                                      ? `${task.title} — Kritischer Pfad — Verzögerung wirkt sich auf Gesamtprojekt aus`
                                      : `${task.title} • ${STATUS_LABEL[task.status] ?? task.status}`
                                  }
                                  onMouseDown={(e) => handleBarMouseDown(e, task, "move")}
                                >
                                  {/* Fortschrittsbalken */}
                                  <div
                                    className="h-full rounded-l"
                                    style={{
                                      width: task.status === "done" ? "100%" : "50%",
                                      backgroundColor: color + "60",
                                    }}
                                  />
                                  {/* Task-Titel im Balken */}
                                  {bar.width > 50 && (
                                    <span
                                      className="absolute inset-0 flex items-center px-1.5 text-[9px] text-white/80 truncate pointer-events-none"
                                    >
                                      {task.title}
                                    </span>
                                  )}
                                  {/* Resize-Handle rechts */}
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      handleBarMouseDown(e, task, "resize");
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Tasks ohne Datum */}
                {tasksWithoutDates.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-zinc-600">
                      {tasksWithoutDates.length} Tasks ohne Datum (nicht dargestellt)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Mini-Map ─── */}
            {tasksWithDates.length > 0 && (
              <div
                className="shrink-0 border-t border-[#2a2a2a] bg-[#0a0a0a] cursor-pointer overflow-hidden"
                style={{ height: MINIMAP_HEIGHT }}
                ref={minimapRef}
                onClick={handleMinimapClick}
                title="Klicken zum Navigieren"
              >
                <div className="relative h-full" style={{ minWidth: LABEL_WIDTH + totalWidth }}>
                  {/* Mini-Map Tasks */}
                  {tasksWithDates.map((task, rowIndex) => {
                    const bar = barProps(task);
                    if (!bar) return null;
                    const color = STATUS_COLOR[task.status] ?? "#71717a";
                    const isCritical = criticalSet.has(task.id);
                    const scaleY = MINIMAP_HEIGHT / Math.max(tasksWithDates.length * MINIMAP_BAR_HEIGHT * 2, MINIMAP_HEIGHT);
                    const y = rowIndex * (MINIMAP_HEIGHT / tasksWithDates.length);
                    return (
                      <div
                        key={task.id}
                        className="absolute"
                        style={{
                          left: LABEL_WIDTH + bar.left,
                          top: y,
                          width: Math.max(bar.width, 2),
                          height: Math.max(MINIMAP_HEIGHT / tasksWithDates.length - 1, 2),
                          backgroundColor: isCritical ? "#ef4444" : color + "60",
                          borderLeft: isCritical ? "1px solid #ef4444" : undefined,
                        }}
                      />
                    );
                  })}
                  {/* Heute-Linie in Mini-Map */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 bg-red-500/60 pointer-events-none"
                      style={{ left: LABEL_WIDTH + todayOffset * dayWidth, width: 1 }}
                    />
                  )}
                  {/* Viewport-Indikator */}
                  <MiniMapViewport scrollRef={scrollRef} totalWidth={LABEL_WIDTH + totalWidth} minimapRef={minimapRef} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-0.5">
                  <span className="text-[9px] text-zinc-700">Mini-Map — Klicken zum Navigieren</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mini-Map Viewport-Indikator ──────────────────────────────────────────────

function MiniMapViewport({
  scrollRef,
  totalWidth,
  minimapRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  totalWidth: number;
  minimapRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [vpStyle, setVpStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    const minimap = minimapRef.current;
    if (!el || !minimap) return;

    const update = () => {
      const scale = minimap.offsetWidth / totalWidth;
      const vpLeft = el.scrollLeft * scale;
      const vpWidth = el.clientWidth * scale;
      setVpStyle({ left: vpLeft, width: vpWidth });
    };

    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRef, totalWidth, minimapRef]);

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: vpStyle.left,
        width: vpStyle.width,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    />
  );
}
