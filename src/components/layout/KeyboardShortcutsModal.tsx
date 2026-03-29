"use client";

import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { useKeyboardShortcutsModal } from "@/hooks/useKeyboardShortcutsModal";
// Hinweis: Keyboard-Shortcuts (?, Esc) werden zentral in useKeyboardShortcuts verwaltet

// ─── Shortcuts-Daten ─────────────────────────────────────────────────────────

const SHORTCUTS = [
  {
    category: "Navigation",
    items: [
      { keys: ["⌘", "K"], label: "Command Palette öffnen" },
      { keys: ["G", "T"], label: "Zu Tasks navigieren" },
      { keys: ["G", "P"], label: "Zu Projekten navigieren" },
      { keys: ["G", "F"], label: "Zu Finanzen navigieren" },
      { keys: ["G", "K"], label: "Zu Kalender navigieren" },
      { keys: ["G", "S"], label: "Zur Suche navigieren" },
      { keys: ["Esc"], label: "Modal / Palette schließen" },
    ],
  },
  {
    category: "Tasks",
    items: [
      { keys: ["E"], label: "Ausgewählten Task bearbeiten" },
      { keys: ["D"], label: "Task als erledigt markieren" },
      { keys: ["A"], label: "Task zuweisen (Assignee-Picker)" },
      { keys: ["⌘", "⇧", "N"], label: "Neuen Task erstellen" },
    ],
  },
  {
    category: "Befehlspalette",
    items: [
      { keys: ['n "Name"'], label: 'Task direkt erstellen: n "Task-Name"' },
      { keys: ["p Name"], label: "Direkt zu Projekt: p Projektname" },
    ],
  },
  {
    category: "Hilfe",
    items: [
      { keys: ["?"], label: "Tastenkürzel-Übersicht anzeigen / schließen" },
    ],
  },
];

// ─── Subkomponenten ───────────────────────────────────────────────────────────

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 text-[11px] font-mono font-semibold text-zinc-300 bg-[#252525] border border-[#3a3a3a] rounded shadow-sm">
      {children}
    </kbd>
  );
}

// ─── Fokus-Trap Hilfsfunktion ─────────────────────────────────────────────────

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled"));
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export function KeyboardShortcutsModal() {
  const { open, setOpen } = useKeyboardShortcutsModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fokus bei Öffnen auf Close-Button setzen
  useEffect(() => {
    if (open) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard-Trap: Tab bleibt im Modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const container = modalRef.current;
      if (!container) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
      >
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span id="shortcuts-modal-title" className="text-sm font-semibold text-white">
                Tastenkürzel
              </span>
            </div>
            <button
              ref={closeButtonRef}
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Tastenkürzel-Übersicht schließen"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {SHORTCUTS.map((section) => (
              <div key={section.category}>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {section.category}
                </p>
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-zinc-300">{item.label}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.keys.map((k, i) => (
                          <Key key={i}>{k}</Key>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#2a2a2a] text-center">
            <p className="text-[11px] text-zinc-600">
              Drücke{" "}
              <kbd className="text-[10px] bg-[#2a2a2a] px-1 py-0.5 rounded text-zinc-500">
                Esc
              </kbd>{" "}
              oder{" "}
              <kbd className="text-[10px] bg-[#2a2a2a] px-1 py-0.5 rounded text-zinc-500">
                ?
              </kbd>{" "}
              zum Schließen
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
