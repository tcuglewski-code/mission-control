"use client";

import { useState, useEffect, useCallback } from "react";
import {
  WidgetConfig,
  WIDGET_CONFIG_KEY,
  getDefaultWidgetConfig,
  mergeWithDefaults,
} from "@/lib/widgets";

export function useWidgetConfig() {
  const [config, setConfig] = useState<WidgetConfig[]>(getDefaultWidgetConfig);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDGET_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WidgetConfig[];
        setConfig(mergeWithDefaults(parsed));
      }
    } catch {
      // ignore – use defaults
    }
  }, []);

  const saveConfig = useCallback((next: WidgetConfig[]) => {
    setConfig(next);
    try {
      localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const toggleWidget = useCallback(
    (id: string) => {
      saveConfig(
        config.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
      );
    },
    [config, saveConfig]
  );

  const reorderWidgets = useCallback(
    (newOrder: WidgetConfig[]) => {
      saveConfig(newOrder);
    },
    [saveConfig]
  );

  const resetConfig = useCallback(() => {
    const defaults = getDefaultWidgetConfig();
    setConfig(defaults);
    try {
      localStorage.removeItem(WIDGET_CONFIG_KEY);
    } catch {
      // ignore
    }
  }, []);

  const visibleWidgets = config
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  return { config, visibleWidgets, toggleWidget, reorderWidgets, resetConfig };
}
