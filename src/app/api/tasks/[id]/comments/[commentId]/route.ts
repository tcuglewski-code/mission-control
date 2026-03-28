import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// DELETE /api/tasks/[id]/comments/[commentId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskId, commentId } = await params;

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
    }

    if (comment.taskId !== taskId) {
      return NextResponse.json({ error: "Kommentar gehört nicht zu diesem Task" }, { status: 400 });
    }

    // Admins können alle Kommentare löschen, normale User nur ihre eigenen
    const isAdmin = user.role === "admin";
    const isOwner = comment.authorId === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Nur eigene Kommentare können gelöscht werden" },
        { status: 403 }
      );
    }

    await prisma.taskComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tasks/[id]/comments/[commentId]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
