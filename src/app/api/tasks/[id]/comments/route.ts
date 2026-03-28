import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/tasks/[id]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskId } = await params;

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (err) {
    console.error("[GET /api/tasks/[id]/comments]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { content, authorName, authorEmail } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Inhalt darf nicht leer sein" }, { status: 400 });
    }

    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task nicht gefunden" }, { status: 404 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        content: content.trim(),
        authorName: authorName?.trim() || "Amadeus",
        authorEmail: authorEmail?.trim() || null,
        authorId: user.id || null,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks/[id]/comments]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
