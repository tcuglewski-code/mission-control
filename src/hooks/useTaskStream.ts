"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Hook für Echtzeit Task-Updates via Server-Sent Events (SSE)

type StreamStatus = "verbunden" | "getrennt" | "verbinde";

interface UseTaskStreamOptions {
  onTaskUpdate?: (tasks: any[]) => void;
  enabled?: boolean;
}

export function useTaskStream({ onTaskUpdate, enabled = true }: UseTaskStreamOptions = {}) {
  const [status, setStatus] = useState<StreamStatus>("getrennt");
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verbinden = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus("verbinde");

    try {
      const es = new EventSource("/api/tasks/stream");
      esRef.current = es;

      es.addEventListener("connected", () => {
        setStatus("verbunden");
      });

      es.addEventListener("tasks_update", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.tasks && onTaskUpdate) {
            onTaskUpdate(data.tasks);
          }
        } catch {}
      });

      es.addEventListener("heartbeat", () => {
        setStatus("verbunden");
      });

      es.onerror = () => {
        setStatus("getrennt");
        es.close();
        esRef.current = null;
        // Nach 30 Sekunden neu verbinden (Fallback)
        reconnectTimerRef.current = setTimeout(verbinden, 30_000);
      };
    } catch {
      setStatus("getrennt");
    }
  }, [enabled, onTaskUpdate]);

  useEffect(() => {
    verbinden();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [verbinden]);

  return { status, verbinden };
}
