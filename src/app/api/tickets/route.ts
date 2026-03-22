import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    // Non-admins sehen nur Tickets aus erlaubten Projekten
    const accessFilter =
      user.role !== "admin"
        ? { OR: [{ projectId: null }, { projectId: { in: user.projectAccess } }] }
        : undefined;

    const tickets = await prisma.ticket.findMany({
      where: {
        ...accessFilter,
        ...(status ? { status } : {}),
        ...(projectId
          ? user.role !== "admin" && !user.projectAccess.includes(projectId)
            ? { id: "__none__" }
            : { projectId }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("[GET /api/tickets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, priority, category, projectId, assigneeId, taskId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Non-admins can only create tickets for projects they have access to
    if (projectId && user.role !== "admin" && !user.projectAccess.includes(projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        status: status ?? "open",
        priority: priority ?? "medium",
        category: category || null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        taskId: taskId || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    triggerWebhooks("ticket.created", { ticket }, ticket.projectId ?? undefined);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tickets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
