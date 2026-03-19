import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
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
    const body = await req.json();
    const { title, description, status, priority, category, projectId, assigneeId, taskId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
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

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tickets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
