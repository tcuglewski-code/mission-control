/**
 * lib/ai-usage.ts — KI Token-Tracking Hilfsfunktionen
 * Berechnet Kosten und loggt Verbrauch in die DB.
 */

import { prisma } from "@/lib/prisma";

// Preistabelle (pro Million Tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  // Haiku
  "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  // Sonnet
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
  // Opus
  "claude-opus-4-5": { input: 15.0, output: 75.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

// Default für unbekannte Modelle (Sonnet-Pricing als Fallback)
const DEFAULT_PRICING = { input: 3.0, output: 15.0 };

/**
 * Berechnet Kosten in USD basierend auf Modell + Tokens
 */
export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 Dezimalstellen
}

export interface LogAiUsageParams {
  source: "api" | "max";
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  projectId?: string;
  taskId?: string;
  sprintId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Loggt einen KI-Aufruf in die DB (fire-and-forget)
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  const {
    source,
    feature,
    model,
    inputTokens,
    outputTokens,
    projectId,
    taskId,
    sprintId,
    metadata,
  } = params;

  const totalTokens = inputTokens + outputTokens;
  const costUsd = calcCost(model, inputTokens, outputTokens);

  try {
    await prisma.aiUsage.create({
      data: {
        source,
        feature,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
        projectId: projectId ?? null,
        taskId: taskId ?? null,
        sprintId: sprintId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    // Fire-and-forget: Log but don't throw
    console.error("[logAiUsage] Failed to log AI usage:", error);
  }
}

/**
 * Wrapper für fire-and-forget Logging (kein await, try/catch inklusive)
 */
export function logAiUsageFireAndForget(params: LogAiUsageParams): void {
  logAiUsage(params).catch((err) => {
    console.error("[logAiUsageFireAndForget] Error:", err);
  });
}
