import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Öffentlicher Endpunkt für das Embed-Widget (kein Login erforderlich)
// Token-Validierung erfolgt im Frontend
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [activeProjects, tasksThisWeek, users, weeklyTasks] = await Promise.all([
      prisma.project.count({ where: { status: "active", archived: false } }),
      prisma.task.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.findMany({ select: { id: true, weeklyCapacity: true } }),
      prisma.task.findMany({
        where: { updatedAt: { gte: weekStart } },
        select: { assigneeId: true, timeSpentSeconds: true },
      }),
    ]);

    const totalCapacity = users.reduce((s, u) => s + u.weeklyCapacity, 0);
    const usedHours = weeklyTasks.reduce((s, t) => s + t.timeSpentSeconds / 3600, 0);
    const teamUtilization =
      totalCapacity > 0 ? Math.round((usedHours / totalCapacity) * 100) : 0;

    return NextResponse.json(
      { activeProjects, tasksThisWeek, teamUtilization },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/analytics/embed]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
