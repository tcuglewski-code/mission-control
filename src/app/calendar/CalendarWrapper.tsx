"use client";

import { useEffect } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { useAppStore, type Event } from "@/store/useAppStore";

interface CalendarWrapperProps {
  initialEvents: Event[];
}

export function CalendarWrapper({ initialEvents }: CalendarWrapperProps) {
  const { events, setEvents } = useAppStore();

  useEffect(() => {
    setEvents(initialEvents);
  }, []);

  return <CalendarView events={events.length > 0 ? events : initialEvents} />;
}
