"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IceScoreBadge } from "./IceScoreBadge";
import { Loader2, TargetIcon, TrendingUpIcon, ZapIcon } from "lucide-react";

interface IceScoreEditorProps {
  taskId: string;
  initialImpact?: number | null;
  initialConfidence?: number | null;
  initialEase?: number | null;
  initialScore?: number | null;
  onSave?: (values: { iceImpact: number; iceConfidence: number; iceEase: number; iceScore: number }) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * ICE Score Editor - Inline-Editor für Impact, Confidence, Ease
 * 
 * ICE Framework:
 * - Impact (1-10): Wie viel Wert bringt das Feature für Nutzer/Business?
 * - Confidence (1-10): Wie sicher sind wir bei unserer Einschätzung?
 * - Ease (1-10): Wie einfach/schnell ist die Umsetzung? (1=sehr schwer, 10=sehr einfach)
 */
export function IceScoreEditor({
  taskId,
  initialImpact,
  initialConfidence,
  initialEase,
  initialScore,
  onSave,
  disabled = false,
  className,
}: IceScoreEditorProps) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState(initialImpact ?? 5);
  const [confidence, setConfidence] = useState(initialConfidence ?? 5);
  const [ease, setEase] = useState(initialEase ?? 5);
  const [saving, setSaving] = useState(false);

  // Berechne Score live
  const calculatedScore = (impact * confidence * ease) / 10;

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    setSaving(true);
    try {
      await onSave({
        iceImpact: impact,
        iceConfidence: confidence,
        iceEase: ease,
        iceScore: calculatedScore,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, [onSave, impact, confidence, ease, calculatedScore]);

  const handleReset = useCallback(() => {
    setImpact(initialImpact ?? 5);
    setConfidence(initialConfidence ?? 5);
    setEase(initialEase ?? 5);
  }, [initialImpact, initialConfidence, initialEase]);

  // Beschreibungen für Slider-Werte
  const getValueLabel = (value: number, type: "impact" | "confidence" | "ease") => {
    const labels = {
      impact: {
        1: "Minimal",
        2: "Sehr gering",
        3: "Gering",
        4: "Unterdurchschnittlich",
        5: "Mittel",
        6: "Überdurchschnittlich",
        7: "Hoch",
        8: "Sehr hoch",
        9: "Enorm",
        10: "Game-Changer",
      },
      confidence: {
        1: "Reine Spekulation",
        2: "Sehr unsicher",
        3: "Unsicher",
        4: "Eher unsicher",
        5: "50/50",
        6: "Eher sicher",
        7: "Ziemlich sicher",
        8: "Sehr sicher",
        9: "Fast sicher",
        10: "100% sicher",
      },
      ease: {
        1: "Extrem aufwändig",
        2: "Sehr aufwändig",
        3: "Aufwändig",
        4: "Eher aufwändig",
        5: "Mittel",
        6: "Überschaubar",
        7: "Einfach",
        8: "Sehr einfach",
        9: "Trivial",
        10: "Sofort machbar",
      },
    };
    return labels[type][value as keyof typeof labels.impact] || value;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          aria-label="ICE Score bearbeiten"
        >
          <IceScoreBadge
            impact={initialImpact}
            confidence={initialConfidence}
            ease={initialEase}
            score={initialScore}
            showDetails
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-green-600" />
              ICE Scoring
            </h4>
            <IceScoreBadge
              impact={impact}
              confidence={confidence}
              ease={ease}
              size="lg"
            />
          </div>

          {/* Impact Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUpIcon className="h-3.5 w-3.5 text-blue-500" />
                Impact
              </Label>
              <span className="text-xs text-gray-500">{impact}/10 — {getValueLabel(impact, "impact")}</span>
            </div>
            <Slider
              value={[impact]}
              onValueChange={([v]) => setImpact(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
              disabled={disabled}
            />
            <p className="text-[10px] text-gray-400">
              Wie viel Wert bringt das Feature für Nutzer oder Business?
            </p>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <TargetIcon className="h-3.5 w-3.5 text-purple-500" />
                Confidence
              </Label>
              <span className="text-xs text-gray-500">{confidence}/10 — {getValueLabel(confidence, "confidence")}</span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={([v]) => setConfidence(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
              disabled={disabled}
            />
            <p className="text-[10px] text-gray-400">
              Wie sicher sind wir bei unserer Einschätzung?
            </p>
          </div>

          {/* Ease Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <ZapIcon className="h-3.5 w-3.5 text-amber-500" />
                Ease
              </Label>
              <span className="text-xs text-gray-500">{ease}/10 — {getValueLabel(ease, "ease")}</span>
            </div>
            <Slider
              value={[ease]}
              onValueChange={([v]) => setEase(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
              disabled={disabled}
            />
            <p className="text-[10px] text-gray-400">
              Wie einfach/schnell ist die Umsetzung?
            </p>
          </div>

          {/* Formel Anzeige */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 text-center">
            <span className="text-xs text-gray-500">
              ({impact} × {confidence} × {ease}) / 10 = <strong className="text-gray-900 dark:text-white">{calculatedScore.toFixed(1)}</strong>
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={disabled || saving}
            >
              Zurücksetzen
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={disabled || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Speichern
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
