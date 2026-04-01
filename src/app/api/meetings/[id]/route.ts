import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-utils";
import { logActivity } from "@/lib/audit";

// GET /api/meetings/[id] - Meeting Details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      actionItems: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

// PUT /api/meetings/[id] - Meeting aktualisieren
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  const {
    title,
    date,
    duration,
    location,
    participants,
    agenda,
    notes,
    decisions,
    projectId,
    projectName,
    status,
    isArchived,
  } = body;

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(duration !== undefined && { duration: duration ? parseInt(duration, 10) : null }),
      ...(location !== undefined && { location }),
      ...(participants !== undefined && { participants: JSON.stringify(participants) }),
      ...(agenda !== undefined && { agenda }),
      ...(notes !== undefined && { notes }),
      ...(decisions !== undefined && { decisions }),
      ...(projectId !== undefined && { projectId }),
      ...(projectName !== undefined && { projectName }),
      ...(status !== undefined && { status }),
      ...(isArchived !== undefined && { isArchived }),
    },
    include: {
      actionItems: true,
    },
  });

  await logActivity({
    action: "MEETING_UPDATED",
    entityType: "meeting",
    entityId: meeting.id,
    entityName: meeting.title,
    userId: auth.userId,
    userEmail: auth.email,
    projectId: meeting.projectId || undefined,
    details: { status: meeting.status, isArchived: meeting.isArchived },
  });

  return NextResponse.json(meeting);
}

// DELETE /api/meetings/[id] - Meeting löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  await prisma.meeting.delete({ where: { id } });

  await logActivity({
    action: "MEETING_DELETED",
    entityType: "meeting",
    entityId: id,
    entityName: existing.title,
    userId: auth.userId,
    userEmail: auth.email,
    projectId: existing.projectId || undefined,
  });

  return NextResponse.json({ success: true });
}
