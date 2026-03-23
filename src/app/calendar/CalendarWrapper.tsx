"use client";

import { useEffect, useState } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { useAppStore, type Event } from "@/store/useAppStore";

interface CalendarWrapperProps {
  initialEvents: Event[];
}

interface TaskWithDates {
  id: string;
  title: string;
  status: string;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: string;
  project?: { color: string } | null;
}

function taskToEvent(task: TaskWithDates, useStartDate: boolean): Event {
  const date = useStartDate ? task.startDate : task.dueDate;
  const prefix = useStartDate ? "▶ " : "📅 ";
  return {
    id: `task-${task.id}-${useStartDate ? "start" : "due"}`,
    title: `${prefix}${task.title}`,
    description: `Status: ${task.status}`,
    type: "task",
    color: task.project?.color ?? "#3b82f6",
    startTime: new Date(date!),
    endTime: null,
    recurring: null,
    taskId: task.id,
  };
}

export function CalendarWrapper({ initialEvents }: CalendarWrapperProps) {
  const { events, setEvents } = useAppStore();
  const [taskEvents, setTaskEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents(initialEvents);
  }, []);

  useEffect(() => {
    // Fetch tasks with dates to show on calendar
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((tasks: TaskWithDates[]) => {
        if (!Array.isArray(tasks)) return;
        const converted: Event[] = [];
        for (const task of tasks) {
          if (task.startDate) converted.push(taskToEvent(task, true));
          if (task.dueDate) converted.push(taskToEvent(task, false));
        }
        setTaskEvents(converted);
      })
      .catch(() => {});
  }, []);

  const allEvents = [
    ...(events.length > 0 ? events : initialEvents),
    ...taskEvents,
  ];

  // Deduplicate by id (task events from DB are already included if they were created via start route)
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return <CalendarView events={deduped} />;
}
