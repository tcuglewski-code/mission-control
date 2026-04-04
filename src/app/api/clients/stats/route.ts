import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/clients/stats
 * Stub-Route für Client-Statistiken
 */
export async function GET() {
  return NextResponse.json({
    totalClients: 0,
    activeClients: 0,
    newThisMonth: 0,
    churnRate: 0,
    message: "API stub - no data available",
  });
}
