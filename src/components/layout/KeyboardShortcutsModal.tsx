"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { useKeyboardShortcutsModal } from "@/hooks/useKeyboardShortcutsModal";

const SHORTCUTS = [
  {
    category: "Navigation",
    items: [
      { keys: ["⌘", "K"], label: "Command Palette öffnen" },
      { keys: ["⌘", "/"], label: "Suche" },
      { keys: ["Esc"], label: "Modal / Palette schließen" },
    ],
  },
  {
    category: "Tasks",
    items: [
      { keys: ["⌘", "⇧", "N"], label: "Neuen Task erstellen (Quick-Add)" },
    ],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 text-[11px] font-mono font-semibold text-zinc-300 bg-[#252525] border border-[#3a3a3a] rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const { open, setOpen } = useKeyboardShortcutsModal();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
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
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Tastenkürzel</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="p-5 space-y-5">
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
              zum Schließen
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
