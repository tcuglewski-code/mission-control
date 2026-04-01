import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-utils";
import { logActivity } from "@/lib/audit";

// GET /api/meetings - Liste alle Meetings
export async function GET(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const includeArchived = searchParams.get("includeArchived") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  
  if (projectId) {
    where.projectId = projectId;
  }
  if (status) {
    where.status = status;
  }
  if (!includeArchived) {
    where.isArchived = false;
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        actionItems: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.meeting.count({ where }),
  ]);

  return NextResponse.json({ meetings, total, limit, offset });
}

// POST /api/meetings - Neues Meeting erstellen
export async function POST(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
      organizerId,
      organizerName,
      status,
      actionItems,
    } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "Title und Date sind erforderlich" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date: new Date(date),
        duration: duration ? parseInt(duration, 10) : null,
        location,
        participants: participants ? JSON.stringify(participants) : null,
        agenda,
        notes,
        decisions,
        projectId,
        projectName,
        organizerId: organizerId || auth.userId,
        organizerName: organizerName || auth.email || "Unbekannt",
        status: status || "scheduled",
        actionItems: actionItems?.length
          ? {
              create: actionItems.map((item: {
                title: string;
                assigneeId?: string;
                assigneeName?: string;
                dueDate?: string;
                priority?: string;
              }) => ({
                title: item.title,
                assigneeId: item.assigneeId,
                assigneeName: item.assigneeName,
                dueDate: item.dueDate ? new Date(item.dueDate) : null,
                priority: item.priority || "medium",
              })),
            }
          : undefined,
      },
      include: {
        actionItems: true,
      },
    });

    await logActivity({
      action: "MEETING_CREATED",
      entityType: "meeting",
      entityId: meeting.id,
      entityName: meeting.title,
      userId: auth.userId,
      userEmail: auth.email,
      projectId,
      details: { date: meeting.date, location, actionItemsCount: actionItems?.length || 0 },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Meeting create error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Meetings" },
      { status: 500 }
    );
  }
}
