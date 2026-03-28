"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, SkipForward } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  selector: string; // CSS-Selektor des hervorgehobenen Elements
  placement: "bottom" | "top" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "projects",
    title: "Deine Projekte",
    description:
      "Hier findest du alle deine Projekte auf einen Blick. Klicke auf ein Projekt, um Details, Tasks und den Fortschritt zu sehen.",
    selector: '[href="/projects"]',
    placement: "right",
  },
  {
    id: "tasks",
    title: "Tasks erstellen",
    description:
      "Hier kannst du schnell neue Tasks erstellen. Nutze den Shortcut Strg+Shift+N (bzw. ⌘⇧N auf Mac) für noch schnelleren Zugriff.",
    selector: '[href="/tasks"]',
    placement: "right",
  },
  {
    id: "search",
    title: "Schnellsuche",
    description:
      "Mit der Suche findest du blitzschnell alles — Tasks, Projekte, Dokumente. Tastenkürzel: Cmd+K (Mac) oder Strg+K.",
    selector: 'button[class*="Search"], button:has(.lucide-search)',
    placement: "bottom",
  },
  {
    id: "notifications",
    title: "Benachrichtigungen",
    description:
      "Hier siehst du alle deine Benachrichtigungen — neue Kommentare, Deadlines, Team-Updates und mehr.",
    selector: '[data-tour="notifications"]',
    placement: "bottom",
  },
  {
    id: "time",
    title: "Zeiterfassung",
    description:
      "Unter Zeiterfassung kannst du deine Arbeitszeit pro Task tracken, Berichte erstellen und den Überblick behalten.",
    selector: '[href="/time"]',
    placement: "right",
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

function getTooltipPosition(
  target: DOMRect,
  placement: TourStep["placement"],
  tooltipW = 300,
  tooltipH = 140
): TooltipPosition {
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;
  let arrowSide: TooltipPosition["arrowSide"] = "top";

  switch (placement) {
    case "right":
      top = target.top + target.height / 2 - tooltipH / 2;
      left = target.right + margin;
      arrowSide = "left";
      break;
    case "left":
      top = target.top + target.height / 2 - tooltipH / 2;
      left = target.left - tooltipW - margin;
      arrowSide = "right";
      break;
    case "bottom":
      top = target.bottom + margin;
      left = target.left + target.width / 2 - tooltipW / 2;
      arrowSide = "top";
      break;
    case "top":
    default:
      top = target.top - tooltipH - margin;
      left = target.left + target.width / 2 - tooltipW / 2;
      arrowSide = "bottom";
      break;
  }

  // Clamp to viewport
  left = Math.max(8, Math.min(left, vw - tooltipW - 8));
  top = Math.max(8, Math.min(top, vh - tooltipH - 8));

  return { top, left, arrowSide };
}

interface DashboardTourProps {
  onComplete: () => void;
}

export function DashboardTour({ onComplete }: DashboardTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  const currentStep = TOUR_STEPS[stepIndex];

  const findAndHighlight = useCallback(() => {
    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setVisible(true);
      // Scroll ins Sichtfeld
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setTargetRect(null);
      setVisible(true); // Tooltip trotzdem zeigen (centered)
    }
  }, [currentStep.selector]);

  useEffect(() => {
    const timeout = setTimeout(findAndHighlight, 100);
    return () => clearTimeout(timeout);
  }, [findAndHighlight]);

  async function handleNext() {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setVisible(false);
      setTimeout(() => setStepIndex((i) => i + 1), 200);
    } else {
      await finishTour();
    }
  }

  async function finishTour() {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourComplete: true }),
      });
    } catch {
      // Fehler ignorieren
    }
    onComplete();
  }

  // Tooltip-Position berechnen
  const tooltipW = 300;
  const tooltipH = 160;
  let pos: TooltipPosition = {
    top: window.innerHeight / 2 - tooltipH / 2,
    left: window.innerWidth / 2 - tooltipW / 2,
    arrowSide: "top",
  };

  if (targetRect) {
    pos = getTooltipPosition(targetRect, currentStep.placement, tooltipW, tooltipH);
  }

  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9000] pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.6)",
          transition: "opacity 0.2s",
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Highlight-Rahmen */}
      {targetRect && visible && (
        <div
          className="fixed z-[9001] pointer-events-none rounded-lg"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow:
              "0 0 0 4px #10b981, 0 0 0 9999px rgba(0,0,0,0.6)",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[9002] pointer-events-auto"
        style={{
          top: pos.top,
          left: pos.left,
          width: tooltipW,
          transition: "opacity 0.2s, top 0.3s, left 0.3s",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Pfeil */}
        {pos.arrowSide === "left" && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-2 w-0 h-0"
            style={{
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "8px solid #1e1e1e",
            }}
          />
        )}
        {pos.arrowSide === "right" && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0"
            style={{
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "8px solid #1e1e1e",
            }}
          />
        )}
        {pos.arrowSide === "top" && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "8px solid #1e1e1e",
            }}
          />
        )}
        {pos.arrowSide === "bottom" && (
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid #1e1e1e",
            }}
          />
        )}

        {/* Karte */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-2xl p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {stepIndex + 1} / {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={finishTour}
              className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 -mt-1 -mr-1"
              title="Tour beenden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fortschrittsbalken */}
          <div className="w-full h-1 bg-[#2a2a2a] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <h3 className="text-sm font-semibold text-white mb-2">{currentStep.title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={finishTour}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Überspringen
            </button>
            <div className="flex-1" />
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {stepIndex < TOUR_STEPS.length - 1 ? (
                <>
                  Weiter
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>Fertig ✓</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
