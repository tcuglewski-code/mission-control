import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/webhook-logs
 * Stub-Route für Webhook-Logs
 */
export async function GET() {
  return NextResponse.json({
    logs: [],
    total: 0,
    message: "API stub - use /api/webhooks/[id]/logs instead",
  });
}
