import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

// GET /api/pomodoro?range=today|week
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "today";

  const now = new Date();
  let start: Date;
  let end: Date;

  if (range === "week") {
    start = startOfWeek(now, { weekStartsOn: 1 });
    end = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    start = startOfDay(now);
    end = endOfDay(now);
  }

  const sessions = await prisma.pomodoroSession.findMany({
    where: {
      userId: session.user.id,
      type: "work",
      completedAt: { gte: start, lte: end },
    },
    orderBy: { completedAt: "desc" },
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const count = sessions.length;

  return NextResponse.json({ sessions, count, totalMinutes });
}

// POST /api/pomodoro — Pomodoro-Session abschließen
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { taskId, duration, type } = body;

  if (!duration)
    return NextResponse.json({ error: "duration required" }, { status: 400 });

  const pomodoro = await prisma.pomodoroSession.create({
    data: {
      userId: session.user.id,
      taskId: taskId ?? null,
      duration: Number(duration),
      type: type ?? "work",
      completedAt: new Date(),
    },
  });

  // Automatisch TimeEntry anlegen wenn es eine Arbeits-Session ist
  if (type === "work" || !type) {
    if (taskId) {
      const now = new Date();
      const startTime = new Date(now.getTime() - duration * 60 * 1000);
      await prisma.timeEntry.create({
        data: {
          taskId,
          userId: session.user.id,
          description: `🍅 Pomodoro (${duration} Min)`,
          startTime,
          endTime: now,
          duration: Number(duration),
          billable: true,
        },
      });
    }
  }

  return NextResponse.json(pomodoro);
}
