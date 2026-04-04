import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ type: string }>;
}

/**
 * GET /api/integrations/[type]
 * Stub-Route für Integrations
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { type } = await params;
  
  return NextResponse.json({
    type,
    configured: false,
    status: "not_configured",
    message: `Integration "${type}" not configured`,
  });
}

/**
 * POST /api/integrations/[type]
 * Stub für Integration-Konfiguration
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { type } = await params;
  
  return NextResponse.json({
    success: false,
    error: `Integration "${type}" nicht implementiert`,
  }, { status: 501 });
}
