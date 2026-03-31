import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logApiError } from "@/lib/error-log";

/**
 * GET /api/tasks/ice-ranking
 * 
 * Gibt Tasks sortiert nach ICE-Score zurück (höchster Score zuerst).
 * Optional: ?status=todo,backlog,in_progress (kommagetrennt) filtert nach Status
 * Optional: ?projectId=xxx filtert nach Projekt
 * Optional: ?limit=20 begrenzt Anzahl
 * Optional: ?includeUnscored=true zeigt auch Tasks ohne ICE-Score
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const includeUnscored = searchParams.get("includeUnscored") === "true";

    // Status-Filter parsen (kommagetrennt)
    const statusList = statusFilter
      ? statusFilter.split(",").map((s) => s.trim())
      : ["todo", "backlog", "in_progress"]; // Default: nur offene Tasks

    // Access-Filter für Non-Admins
    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    // Tasks mit ICE-Score abrufen
    const tasks = await prisma.task.findMany({
      where: {
        ...accessFilter,
        ...(projectId ? { projectId } : {}),
        status: { in: statusList },
        ...(includeUnscored ? {} : { iceScore: { not: null } }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
      },
      orderBy: [
        { iceScore: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Statistiken berechnen
    const allTasks = await prisma.task.findMany({
      where: {
        ...accessFilter,
        ...(projectId ? { projectId } : {}),
        status: { in: statusList },
      },
      select: {
        iceScore: true,
        iceImpact: true,
        iceConfidence: true,
        iceEase: true,
      },
    });

    const scoredTasks = allTasks.filter((t) => t.iceScore !== null);
    const totalTasks = allTasks.length;
    const scoredCount = scoredTasks.length;
    const unscoredCount = totalTasks - scoredCount;
    
    // Durchschnittswerte
    const avgImpact = scoredTasks.length > 0
      ? scoredTasks.reduce((sum, t) => sum + (t.iceImpact || 0), 0) / scoredTasks.length
      : 0;
    const avgConfidence = scoredTasks.length > 0
      ? scoredTasks.reduce((sum, t) => sum + (t.iceConfidence || 0), 0) / scoredTasks.length
      : 0;
    const avgEase = scoredTasks.length > 0
      ? scoredTasks.reduce((sum, t) => sum + (t.iceEase || 0), 0) / scoredTasks.length
      : 0;
    const avgScore = scoredTasks.length > 0
      ? scoredTasks.reduce((sum, t) => sum + (t.iceScore || 0), 0) / scoredTasks.length
      : 0;

    // Score-Verteilung (Buckets: 0-25, 25-50, 50-75, 75-100)
    const distribution = {
      low: scoredTasks.filter((t) => (t.iceScore || 0) < 25).length,
      medium: scoredTasks.filter((t) => (t.iceScore || 0) >= 25 && (t.iceScore || 0) < 50).length,
      high: scoredTasks.filter((t) => (t.iceScore || 0) >= 50 && (t.iceScore || 0) < 75).length,
      veryHigh: scoredTasks.filter((t) => (t.iceScore || 0) >= 75).length,
    };

    return NextResponse.json({
      tasks,
      stats: {
        totalTasks,
        scoredCount,
        unscoredCount,
        avgImpact: Math.round(avgImpact * 10) / 10,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        avgEase: Math.round(avgEase * 10) / 10,
        avgScore: Math.round(avgScore * 10) / 10,
        distribution,
      },
    });
  } catch (error) {
    console.error("[GET /api/tasks/ice-ranking]", error);
    await logApiError({
      path: "/api/tasks/ice-ranking",
      method: "GET",
      statusCode: 500,
      message: String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/tasks/ice-ranking/bulk
 * 
 * Bulk-Update für ICE-Scores mehrerer Tasks.
 * Body: { updates: [{ taskId, iceImpact, iceConfidence, iceEase }] }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body as {
      updates: Array<{
        taskId: string;
        iceImpact: number;
        iceConfidence: number;
        iceEase: number;
      }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "updates array is required" },
        { status: 400 }
      );
    }

    // Validierung: Werte müssen 1-10 sein
    for (const u of updates) {
      if (
        u.iceImpact < 1 || u.iceImpact > 10 ||
        u.iceConfidence < 1 || u.iceConfidence > 10 ||
        u.iceEase < 1 || u.iceEase > 10
      ) {
        return NextResponse.json(
          { error: `ICE values must be between 1-10 for task ${u.taskId}` },
          { status: 400 }
        );
      }
    }

    // Bulk-Update mit Transaction
    const results = await prisma.$transaction(
      updates.map((u) => {
        const iceScore = (u.iceImpact * u.iceConfidence * u.iceEase) / 10;
        return prisma.task.update({
          where: { id: u.taskId },
          data: {
            iceImpact: u.iceImpact,
            iceConfidence: u.iceConfidence,
            iceEase: u.iceEase,
            iceScore,
          },
          select: { id: true, title: true, iceScore: true },
        });
      })
    );

    return NextResponse.json({
      success: true,
      updated: results.length,
      tasks: results,
    });
  } catch (error) {
    console.error("[POST /api/tasks/ice-ranking]", error);
    await logApiError({
      path: "/api/tasks/ice-ranking",
      method: "POST",
      statusCode: 500,
      message: String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
