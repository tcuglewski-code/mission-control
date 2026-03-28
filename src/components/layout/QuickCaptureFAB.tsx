"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Mic, MicOff, X, Zap, ChevronDown, ChevronUp, Leaf } from "lucide-react";
import { useQuickAdd } from "@/hooks/useQuickAdd";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
}

type Priority = "low" | "medium" | "high";

const PRIORITY_CONFIG: Record<Priority, { label: string; activeBg: string; border: string }> = {
  low: {
    label: "Niedrig",
    activeBg: "bg-zinc-700 border-zinc-500 text-white",
    border: "border-zinc-700 text-zinc-400 hover:border-zinc-500",
  },
  medium: {
    label: "Mittel",
    activeBg: "bg-amber-900/40 border-amber-600 text-amber-300",
    border: "border-zinc-700 text-zinc-400 hover:border-amber-600",
  },
  high: {
    label: "Hoch",
    activeBg: "bg-red-900/40 border-red-600 text-red-300",
    border: "border-zinc-700 text-zinc-400 hover:border-red-600",
  },
};

// ─── SpeechRecognition Typen ──────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

interface QuickCaptureSheetProps {
  open: boolean;
  onClose: () => void;
  initialTitle?: string;
}

function QuickCaptureSheet({ open, onClose, initialTitle = "" }: QuickCaptureSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Projekte laden + Zustand zurücksetzen wenn Sheet öffnet
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setError("");
      setProjectId("");
      setPriority("medium");
      setDueDate("");
      setExpanded(false);

      setTimeout(() => inputRef.current?.focus(), 200);

      fetch("/api/projects")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setProjects(list.filter((p: Project) => p && p.id));
        })
        .catch(() => setProjects([]));
    }
  }, [open, initialTitle]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Bitte gib einen Task-Titel ein.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          status: "todo",
          ...(projectId ? { projectId } : {}),
          ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fehler beim Erstellen des Tasks");
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50 lg:hidden
          bg-[#161616] border-t border-[#2a2a2a] rounded-t-2xl
          transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Griff-Indikator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#3a3a3a]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Schnell-Erfassung</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="p-5 space-y-4">
          {/* Titel */}
          <div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Was soll erledigt werden?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              className="w-full bg-[#1e1e1e] border border-[#333] rounded-xl px-4 py-4 text-white placeholder-zinc-500 text-lg outline-none focus:border-emerald-600 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Expand-Button für optionale Felder */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {expanded ? "Weniger Optionen" : "Mehr Optionen (Projekt, Priorität, Fälligkeitsdatum)"}
          </button>

          {/* Optionale Felder */}
          {expanded && (
            <div className="space-y-4 pt-1">
              {/* Projekt */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
                  Projekt
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors appearance-none"
                >
                  <option value="">— Kein Projekt (Inbox) —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priorität */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
                  Priorität
                </label>
                <div className="flex gap-2">
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    const isActive = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border transition-all ${
                          isActive ? cfg.activeBg : `bg-transparent ${cfg.border}`
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fälligkeitsdatum */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
                  Fälligkeitsdatum
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Fehler */}
          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Aktions-Buttons */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm text-zinc-400 hover:text-white rounded-xl hover:bg-[#252525] border border-[#333] transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4" />
              {submitting ? "Erstelle..." : "Task speichern"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sprach-Aufnahme Hook ─────────────────────────────────────────────────────

function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// ─── FAB + Mic ────────────────────────────────────────────────────────────────

export function QuickCaptureFAB() {
  const { open: quickAddOpen } = useQuickAdd();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [speechUnsupported, setSpeechUnsupported] = useState(false);

  const handleSpeechResult = useCallback((text: string) => {
    setSheetTitle(text);
    setSheetOpen(true);
  }, []);

  const { listening, supported, start, stop } = useSpeechRecognition(handleSpeechResult);

  const handleMicClick = () => {
    if (!supported) {
      setSpeechUnsupported(true);
      setTimeout(() => setSpeechUnsupported(false), 3000);
      return;
    }
    if (listening) {
      stop();
    } else {
      start();
    }
  };

  // FAB ausblenden wenn globales QuickAdd-Modal geöffnet ist
  if (quickAddOpen) return null;

  return (
    <>
      {/* FABs — nur Mobile */}
      <div className="fixed bottom-20 right-4 z-40 lg:hidden flex flex-col items-end gap-3">
        {/* Sprach-Notiz: nicht unterstützt Hinweis */}
        {speechUnsupported && (
          <div className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            Spracherkennung nicht unterstützt
          </div>
        )}

        {/* Mikrofon-Button */}
        <button
          onClick={handleMicClick}
          title={listening ? "Aufnahme stoppen" : "Sprachnotiz aufnehmen"}
          className={`
            w-12 h-12 rounded-full shadow-lg flex items-center justify-center
            transition-all duration-200 active:scale-95
            ${listening
              ? "bg-red-600 hover:bg-red-500 animate-pulse"
              : "bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#444]"
            }
          `}
        >
          {listening ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-zinc-300" />
          )}
        </button>

        {/* Quick-Capture-Button */}
        <button
          onClick={() => {
            setSheetTitle("");
            setSheetOpen(true);
          }}
          title="Neuen Task erfassen (Q)"
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <QuickCaptureSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialTitle={sheetTitle}
      />
    </>
  );
}
