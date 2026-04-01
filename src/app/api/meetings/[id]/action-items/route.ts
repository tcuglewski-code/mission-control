import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-utils";
import { logActivity } from "@/lib/audit";

// POST /api/meetings/[id]/action-items - Neues Action Item hinzufügen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: meetingId } = await params;
  const body = await req.json();

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden" }, { status: 404 });
  }

  const { title, assigneeId, assigneeName, dueDate, priority } = body;

  if (!title) {
    return NextResponse.json({ error: "Title ist erforderlich" }, { status: 400 });
  }

  const actionItem = await prisma.meetingActionItem.create({
    data: {
      meetingId,
      title,
      assigneeId,
      assigneeName,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || "medium",
    },
  });

  await logActivity({
    action: "ACTION_ITEM_CREATED",
    entityType: "meeting_action_item",
    entityId: actionItem.id,
    entityName: actionItem.title,
    userId: auth.userId,
    userEmail: auth.email,
    details: { meetingId, meetingTitle: meeting.title },
  });

  return NextResponse.json(actionItem, { status: 201 });
}
