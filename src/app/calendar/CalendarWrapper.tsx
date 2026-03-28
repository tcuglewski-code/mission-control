"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarHeader, type CalendarViewMode } from "@/components/calendar/CalendarHeader";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { CalendarWeek } from "@/components/calendar/CalendarWeek";
import { TaskModal } from "@/components/tasks/TaskModal";
import { useAppStore, type Event, type Task, type Project, type User } from "@/store/useAppStore";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";
import { CalendarDays, CalendarRange } from "lucide-react";

interface CalendarWrapperProps {
  initialEvents: Event[];
  initialTasks: Task[];
  projects: Project[];
  users: User[];
}

type TabMode = "tasks" | "events";

export function CalendarWrapper({ initialEvents, initialTasks, projects, users }: CalendarWrapperProps) {
  const { events, setEvents } = useAppStore();
  const router = useRouter();

  // Tab
  const [tab, setTab] = useState<TabMode>("tasks");

  // Task calendar state
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Events calendar (existing)
  const [taskEvents, setTaskEvents] = useState<Event[]>([]);

  // Load events into store
  useEffect(() => {
    setEvents(initialEvents);
  }, []);

  // Fetch tasks for the current month/week whenever date changes
  const fetchTasksForPeriod = useCallback(async (date: Date) => {
    const monthStr = format(date, "yyyy-MM");
    try {
      const res = await fetch(`/api/tasks?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTasks(data);
        }
      }
    } catch {
      // Fallback: use initialTasks
    }
  }, []);

  useEffect(() => {
    fetchTasksForPeriod(currentDate);
  }, [currentDate]);

  // Keyboard shortcut: Ctrl+Shift+C → /calendar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        router.push("/calendar");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate((d) => subMonths(d, 1));
    } else {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate((d) => addMonths(d, 1));
    } else {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  // Task modal handlers
  const handleTaskClick = (task: Task) => setSelectedTask(task);
  const handleModalClose = () => setSelectedTask(null);

  const handleTaskSave = async (data: Partial<Task>) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
        setSelectedTask(null);
        // Refresh for current period
        fetchTasksForPeriod(currentDate);
      }
    } catch {
      setSelectedTask(null);
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedTask(null);
    } catch {
      setSelectedTask(null);
    }
  };

  // Events calendar (existing logic)
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((fetchedTasks: any[]) => {
        if (!Array.isArray(fetchedTasks)) return;
        const converted: Event[] = [];
        for (const task of fetchedTasks) {
          if (task.startDate) {
            converted.push({
              id: `task-${task.id}-start`,
              title: `▶ ${task.title}`,
              description: `Status: ${task.status}`,
              type: "task",
              color: task.project?.color ?? "#3b82f6",
              startTime: new Date(task.startDate),
              endTime: null,
              recurring: null,
              taskId: task.id,
            });
          }
          if (task.dueDate) {
            converted.push({
              id: `task-${task.id}-due`,
              title: `📅 ${task.title}`,
              description: `Status: ${task.status}`,
              type: "task",
              color: task.project?.color ?? "#3b82f6",
              startTime: new Date(task.dueDate),
              endTime: null,
              recurring: null,
              taskId: task.id,
            });
          }
        }
        setTaskEvents(converted);
      })
      .catch(() => {});
  }, []);

  const allEvents = [...(events.length > 0 ? events : initialEvents), ...taskEvents];
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Tab Navigation */}
      <div className="flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-0.5 self-start">
        <button
          onClick={() => setTab("tasks")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "tasks"
              ? "bg-[#2a2a2a] text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Aufgaben-Kalender
        </button>
        <button
          onClick={() => setTab("events")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "events"
              ? "bg-[#2a2a2a] text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          Events &amp; Sprints
        </button>
      </div>

      {/* Tasks Calendar */}
      {tab === "tasks" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            {[
              { label: "Hohe Priorität", dot: "bg-red-400" },
              { label: "Mittlere Priorität", dot: "bg-yellow-400" },
              { label: "Niedrige Priorität", dot: "bg-green-400" },
            ].map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
            ))}
            <span className="ml-auto text-xs text-zinc-600">
              Strg+Umschalt+C zum schnellen Wechsel
            </span>
          </div>

          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewChange={setViewMode}
          />

          {viewMode === "month" ? (
            <CalendarMonth
              currentDate={currentDate}
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <CalendarWeek
              currentDate={currentDate}
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      )}

      {/* Events Calendar (original) */}
      {tab === "events" && (
        <div className="flex-1 min-h-0">
          <CalendarView events={deduped} />
        </div>
      )}

      {/* TaskModal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          users={users}
          onClose={handleModalClose}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
