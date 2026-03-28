import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  createNotification,
  getAuthUserIdByUserId,
  extractMentions,
  findUsersByMentionNames,
} from "@/lib/notifications";

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
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
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

    // ─── Benachrichtigungen feuern (fire-and-forget) ───────────────────────
    void (async () => {
      const notifiedUsers = new Set<string>();

      // 1) Assignee benachrichtigen (Kommentar hinzugefügt)
      if (task.assigneeId) {
        const assigneeAuthId = await getAuthUserIdByUserId(task.assigneeId);
        if (assigneeAuthId && assigneeAuthId !== user.id) {
          notifiedUsers.add(assigneeAuthId);
          await createNotification(
            assigneeAuthId,
            "comment_added",
            "Neuer Kommentar",
            `${authorName || user.username} kommentierte den Task „${task.title}": ${content.trim().slice(0, 80)}${content.trim().length > 80 ? "…" : ""}`,
            `/tasks`
          );
        }
      }

      // 2) @-Mentions verarbeiten
      const mentionedNames = extractMentions(content);
      if (mentionedNames.length > 0) {
        const mentionedUserIds = await findUsersByMentionNames(mentionedNames);
        for (const mentionedId of mentionedUserIds) {
          if (!notifiedUsers.has(mentionedId) && mentionedId !== user.id) {
            notifiedUsers.add(mentionedId);
            await createNotification(
              mentionedId,
              "mention",
              "Du wurdest erwähnt",
              `${authorName || user.username} hat dich in einem Kommentar zu „${task.title}" erwähnt.`,
              `/tasks`
            );
          }
        }
      }
    })();

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks/[id]/comments]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
