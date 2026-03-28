import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/time-entries/[id]/stop — Timer stoppen
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.endTime) return NextResponse.json({ error: "Timer already stopped" }, { status: 400 });

  const now = new Date();
  const durationMs = now.getTime() - entry.startTime.getTime();
  const durationMin = Math.max(1, Math.round(durationMs / 60000));

  const body = await req.json().catch(() => ({}));

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      endTime: now,
      duration: durationMin,
      description: body.description ?? entry.description,
    },
    include: {
      task: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(updated);
}
