import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/my-day/notes?date=2024-03-28
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const note = await (prisma as any).userDayNote.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  return NextResponse.json(note ?? { content: "" });
}

// POST /api/my-day/notes — upsert
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, content } = await req.json();
  const d = date ?? new Date().toISOString().split("T")[0];

  const note = await (prisma as any).userDayNote.upsert({
    where: { userId_date: { userId: session.user.id, date: d } },
    create: { userId: session.user.id, date: d, content: content ?? "" },
    update: { content: content ?? "" },
  });

  return NextResponse.json(note);
}
