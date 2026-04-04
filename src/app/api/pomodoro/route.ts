import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pomodoro
 * Stub-Route für Pomodoro-Timer
 */
export async function GET() {
  return NextResponse.json({
    sessions: [],
    activeSession: null,
    todayStats: {
      completed: 0,
      totalMinutes: 0,
    },
    message: "API stub - no data available",
  });
}

/**
 * POST /api/pomodoro
 * Stub für neue Pomodoro-Session
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Pomodoro-Feature nicht implementiert",
  }, { status: 501 });
}
