"use client";

/**
 * GlobalKeyboardShortcuts — Registriert alle globalen Keyboard-Shortcuts
 * Wird in RootLayout eingebunden (kein selectedTask-Kontext benötigt).
 */

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function GlobalKeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}
