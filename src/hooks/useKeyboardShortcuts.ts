"use client";

/**
 * useKeyboardShortcuts — Zentralisierter Hook für alle Keyboard-Shortcuts
 * Sprint GC: Keyboard Shortcuts + Accessibility + Command Palette
 */

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "./useCommandPalette";
import { useKeyboardShortcutsModal } from "./useKeyboardShortcutsModal";
import { useQuickAdd } from "./useQuickAdd";

/** Prüft ob ein Texteingabe-Element fokussiert ist */
function isInputFocused(): boolean {
  const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
  const contentEditable = (document.activeElement as HTMLElement)?.contentEditable;
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    contentEditable === "true"
  );
}

interface UseKeyboardShortcutsOptions {
  /** Aktuell ausgewählter Task (für E, D, A shortcuts) */
  selectedTaskId?: string | null;
  /** Callback: Task bearbeiten */
  onEditTask?: (taskId: string) => void;
  /** Callback: Task als erledigt markieren */
  onCompleteTask?: (taskId: string) => void;
  /** Callback: Assignee-Picker öffnen */
  onAssignTask?: (taskId: string) => void;
  /** Shortcuts deaktivieren (z.B. in Modals) */
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedTaskId,
  onEditTask,
  onCompleteTask,
  onAssignTask,
  disabled = false,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const { toggle: toggleCommandPalette, open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const { toggle: toggleShortcutsModal, open: shortcutsModalOpen, setOpen: setShortcutsModalOpen } = useKeyboardShortcutsModal();
  const { setOpen: setQuickAddOpen } = useQuickAdd();

  // G-Sequenz: erstes G gedrückt?
  const gPressedRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGSequence = useCallback(() => {
    gPressedRef.current = false;
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current);
      gTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (disabled) return;

    const handler = (e: KeyboardEvent) => {
      // Nicht feuern wenn Command/Ctrl gedrückt (außer für Cmd+K etc.)
      const withMeta = e.metaKey || e.ctrlKey;

      // ── Cmd+K / Ctrl+K — Command Palette ──────────────────────────────
      if (withMeta && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        resetGSequence();
        return;
      }

      // ── Cmd+Shift+N — Neuen Task erstellen ────────────────────────────
      if (withMeta && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setQuickAddOpen(true);
        resetGSequence();
        return;
      }

      // ── Escape — Modals schließen ──────────────────────────────────────
      if (e.key === "Escape") {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
          resetGSequence();
          return;
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          resetGSequence();
          return;
        }
      }

      // Keine weiteren Shortcuts wenn Input fokussiert ist
      if (isInputFocused()) {
        resetGSequence();
        return;
      }

      // Keine Shortcuts wenn Modals offen sind
      if (commandPaletteOpen || shortcutsModalOpen) {
        return;
      }

      // Kein Modifier für folgende Shortcuts
      if (withMeta || e.altKey) return;

      // ── ? — Shortcuts-Übersicht ────────────────────────────────────────
      if (e.key === "?") {
        e.preventDefault();
        toggleShortcutsModal();
        resetGSequence();
        return;
      }

      // ── G-Sequenz: G → T/P/F/K/S ──────────────────────────────────────
      if (gPressedRef.current) {
        resetGSequence();
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            router.push("/tasks");
            return;
          case "p":
            e.preventDefault();
            router.push("/projects");
            return;
          case "f":
            e.preventDefault();
            router.push("/finance");
            return;
          case "k":
            e.preventDefault();
            router.push("/calendar");
            return;
          case "s":
            e.preventDefault();
            router.push("/search");
            return;
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        gPressedRef.current = true;
        // Sequenz nach 1,5 Sekunden zurücksetzen
        gTimerRef.current = setTimeout(resetGSequence, 1500);
        return;
      }

      // ── Task-Shortcuts (nur wenn Task ausgewählt) ─────────────────────
      if (selectedTaskId) {
        if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          onEditTask?.(selectedTaskId);
          return;
        }
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          onCompleteTask?.(selectedTaskId);
          return;
        }
        if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          onAssignTask?.(selectedTaskId);
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      resetGSequence();
    };
  }, [
    disabled,
    toggleCommandPalette,
    toggleShortcutsModal,
    commandPaletteOpen,
    shortcutsModalOpen,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    setQuickAddOpen,
    selectedTaskId,
    onEditTask,
    onCompleteTask,
    onAssignTask,
    router,
    resetGSequence,
  ]);
}
