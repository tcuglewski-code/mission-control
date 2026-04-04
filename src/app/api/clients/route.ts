import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/clients
 * Stub-Route für Clients API
 */
export async function GET() {
  return NextResponse.json({
    clients: [],
    total: 0,
    message: "API stub - no data available",
  });
}
