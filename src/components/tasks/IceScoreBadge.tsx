"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IceScoreBadgeProps {
  impact?: number | null;
  confidence?: number | null;
  ease?: number | null;
  score?: number | null;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

/**
 * ICE Score Badge - zeigt den berechneten ICE-Score mit Farbcodierung
 * 
 * Score-Berechnung: (Impact × Confidence × Ease) / 10
 * Max-Score: (10 × 10 × 10) / 10 = 100
 * 
 * Farben:
 * - 75-100: Grün (hohe Priorität)
 * - 50-74: Blau (mittlere Priorität)
 * - 25-49: Amber (niedrige Priorität)
 * - 0-24: Grau (sehr niedrige Priorität)
 */
export function IceScoreBadge({
  impact,
  confidence,
  ease,
  score,
  size = "md",
  showDetails = false,
  className,
}: IceScoreBadgeProps) {
  // Berechne Score falls nicht übergeben
  const calculatedScore = score ?? (impact && confidence && ease ? (impact * confidence * ease) / 10 : null);
  
  if (calculatedScore === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500",
          size === "sm" && "px-1.5 py-0.5 text-xs",
          size === "md" && "px-2 py-1 text-sm",
          size === "lg" && "px-3 py-1.5 text-base",
          className
        )}
      >
        <span className="font-mono">ICE</span>
        <span className="text-[10px]">—</span>
      </span>
    );
  }

  // Farbe basierend auf Score
  const getColorClasses = (s: number) => {
    if (s >= 75) return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    if (s >= 50) return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    if (s >= 25) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600";
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        getColorClasses(calculatedScore),
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "md" && "px-2 py-1 text-sm",
        size === "lg" && "px-3 py-1.5 text-base",
        className
      )}
    >
      <span className="font-mono text-[10px] opacity-70">ICE</span>
      <span className="font-semibold">{Math.round(calculatedScore)}</span>
    </span>
  );

  if (!showDetails || !impact || !confidence || !ease) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">ICE Score: {Math.round(calculatedScore)}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-lg">{impact}</div>
                <div className="text-gray-500">Impact</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{confidence}</div>
                <div className="text-gray-500">Confidence</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{ease}</div>
                <div className="text-gray-500">Ease</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Formel: (I × C × E) / 10 = {impact} × {confidence} × {ease} / 10
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
