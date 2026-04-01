import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-utils";
import { logActivity } from "@/lib/audit";

// PUT /api/meetings/action-items/[itemId] - Action Item aktualisieren
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await req.json();

  const existing = await prisma.meetingActionItem.findUnique({ where: { id: itemId } });
  if (!existing) {
    return NextResponse.json({ error: "Action Item nicht gefunden" }, { status: 404 });
  }

  const { title, assigneeId, assigneeName, dueDate, status, priority, taskId } = body;

  const actionItem = await prisma.meetingActionItem.update({
    where: { id: itemId },
    data: {
      ...(title !== undefined && { title }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(assigneeName !== undefined && { assigneeName }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(taskId !== undefined && { taskId }),
    },
  });

  await logActivity({
    action: "ACTION_ITEM_UPDATED",
    entityType: "meeting_action_item",
    entityId: actionItem.id,
    entityName: actionItem.title,
    userId: auth.userId,
    userEmail: auth.email,
    details: { status: actionItem.status, priority: actionItem.priority },
  });

  return NextResponse.json(actionItem);
}

// DELETE /api/meetings/action-items/[itemId] - Action Item löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  const existing = await prisma.meetingActionItem.findUnique({ where: { id: itemId } });
  if (!existing) {
    return NextResponse.json({ error: "Action Item nicht gefunden" }, { status: 404 });
  }

  await prisma.meetingActionItem.delete({ where: { id: itemId } });

  await logActivity({
    action: "ACTION_ITEM_DELETED",
    entityType: "meeting_action_item",
    entityId: itemId,
    entityName: existing.title,
    userId: auth.userId,
    userEmail: auth.email,
  });

  return NextResponse.json({ success: true });
}

// POST /api/meetings/action-items/[itemId] - Task aus Action Item erstellen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await req.json();
  const { projectId } = body;

  const actionItem = await prisma.meetingActionItem.findUnique({
    where: { id: itemId },
    include: { meeting: true },
  });

  if (!actionItem) {
    return NextResponse.json({ error: "Action Item nicht gefunden" }, { status: 404 });
  }

  if (actionItem.taskId) {
    return NextResponse.json(
      { error: "Zu diesem Action Item existiert bereits ein Task" },
      { status: 400 }
    );
  }

  // Task erstellen
  const task = await prisma.task.create({
    data: {
      title: actionItem.title,
      description: `Aus Meeting "${actionItem.meeting.title}" am ${actionItem.meeting.date.toLocaleDateString("de-DE")}`,
      status: "todo",
      priority: actionItem.priority,
      dueDate: actionItem.dueDate,
      assigneeId: actionItem.assigneeId,
      projectId: projectId || actionItem.meeting.projectId,
      labels: "meeting-action",
    },
  });

  // Action Item mit Task verknüpfen
  await prisma.meetingActionItem.update({
    where: { id: itemId },
    data: { taskId: task.id },
  });

  await logActivity({
    action: "TASK_CREATED_FROM_ACTION_ITEM",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    userId: auth.userId,
    userEmail: auth.email,
    projectId: task.projectId || undefined,
    details: { actionItemId: itemId, meetingId: actionItem.meetingId },
  });

  return NextResponse.json({ task, actionItem: { ...actionItem, taskId: task.id } }, { status: 201 });
}
