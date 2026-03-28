import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/time-entries?taskId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  const where: Record<string, string> = {};
  if (taskId) where.taskId = taskId;

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(entries);
}

// POST /api/time-entries — Timer starten
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { taskId, description, billable } = body;

  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  // Check ob bereits ein laufender Timer existiert (für diesen User)
  const running = await prisma.timeEntry.findFirst({
    where: { userId: session.user.id, endTime: null },
  });

  if (running) {
    // Laufenden Timer automatisch stoppen
    const now = new Date();
    const durationMs = now.getTime() - running.startTime.getTime();
    const durationMin = Math.round(durationMs / 60000);
    await prisma.timeEntry.update({
      where: { id: running.id },
      data: { endTime: now, duration: durationMin },
    });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId: session.user.id,
      description: description ?? null,
      startTime: new Date(),
      billable: billable !== false,
    },
    include: {
      task: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
