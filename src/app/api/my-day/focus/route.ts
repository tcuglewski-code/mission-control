import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/my-day/focus?date=2024-03-28
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const entries = await (prisma as any).userTaskFocus.findMany({
    where: { userId: session.user.id, date },
  });

  return NextResponse.json(entries.map((e: any) => e.taskId));
}

// POST /api/my-day/focus — toggle (add / remove)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, date, action } = await req.json();
  const d = date ?? new Date().toISOString().split("T")[0];

  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  if (action === "remove") {
    await (prisma as any).userTaskFocus.deleteMany({
      where: { userId: session.user.id, taskId, date: d },
    });
    return NextResponse.json({ ok: true, action: "removed" });
  }

  // Check max 3
  const count = await (prisma as any).userTaskFocus.count({
    where: { userId: session.user.id, date: d },
  });

  if (count >= 3) {
    return NextResponse.json({ error: "Maximal 3 Fokus-Tasks pro Tag" }, { status: 400 });
  }

  await (prisma as any).userTaskFocus.upsert({
    where: { userId_taskId_date: { userId: session.user.id, taskId, date: d } },
    create: { userId: session.user.id, taskId, date: d },
    update: {},
  });

  return NextResponse.json({ ok: true, action: "added" });
}
