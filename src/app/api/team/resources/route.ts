import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { startOfWeek, addWeeks, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TEAM_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 4 Wochen: aktuelle Woche + 3 Folgewochen
    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const start = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const end = endOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      return { start, end, key: start.toISOString().split("T")[0] };
    });

    // Alle User
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        weeklyCapacity: true,
      },
    });

    // Tasks der nächsten 4 Wochen (mit dueDate)
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: { not: null },
        dueDate: {
          gte: weeks[0].start,
          lte: weeks[3].end,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        storyPoints: true,
        dueDate: true,
        assigneeId: true,
        sprintId: true,
        projectId: true,
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Daten aufbereiten: pro User pro Woche
    const data: Record<string, Record<string, { count: number; tasks: typeof tasks }>> = {};

    for (const u of users) {
      data[u.id] = {};
      for (const week of weeks) {
        const weekTasks = tasks.filter(
          (t: typeof tasks[0]) =>
            t.assigneeId === u.id &&
            t.dueDate &&
            new Date(t.dueDate) >= week.start &&
            new Date(t.dueDate) <= week.end
        );
        data[u.id][week.key] = { count: weekTasks.length, tasks: weekTasks };
      }
    }

    return NextResponse.json({
      users,
      weeks: weeks.map((w) => ({ key: w.key, start: w.start, end: w.end })),
      data,
    });
  } catch (error) {
    console.error("[GET /api/team/resources]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
