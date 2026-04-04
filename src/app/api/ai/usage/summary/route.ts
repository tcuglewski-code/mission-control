import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ai/usage/summary
 * Stub-Route für AI-Usage Summary
 */
export async function GET() {
  return NextResponse.json({
    totalTokens: 0,
    totalCostUsd: 0,
    dailyAverage: 0,
    topFeatures: [],
    message: "API stub - use /api/ai/usage instead",
  });
}
