import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * POST /api/tasks/bulk
 * Body: { ids: string[], action: "status" | "assignee" | "label" | "delete", value?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { ids, action, value } = body as {
      ids: string[];
      action: "status" | "assignee" | "label" | "delete";
      value?: string;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Keine Tasks ausgewählt" }, { status: 400 });
    }

    // Access-Check: User darf nur Tasks aus seinen Projekten bearbeiten
    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    const allowedTasks = await prisma.task.findMany({
      where: { id: { in: ids }, ...accessFilter },
      select: { id: true },
    });
    const allowedIds = allowedTasks.map((t) => t.id);

    if (allowedIds.length === 0) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    let updated = 0;

    if (action === "delete") {
      const result = await prisma.task.deleteMany({
        where: { id: { in: allowedIds } },
      });
      updated = result.count;
    } else if (action === "status" && value) {
      const result = await prisma.task.updateMany({
        where: { id: { in: allowedIds } },
        data: { status: value },
      });
      updated = result.count;
    } else if (action === "assignee") {
      const result = await prisma.task.updateMany({
        where: { id: { in: allowedIds } },
        data: { assigneeId: value || null },
      });
      updated = result.count;
    } else if (action === "label" && value) {
      // Label zu allen Tasks hinzufügen (upsert pro Task)
      const label = await prisma.label.findFirst({
        where: { name: { equals: value, mode: "insensitive" } },
      });
      if (label) {
        for (const taskId of allowedIds) {
          await prisma.taskLabel.upsert({
            where: { taskId_labelId: { taskId, labelId: label.id } },
            create: { taskId, labelId: label.id },
            update: {},
          });
        }
        updated = allowedIds.length;
      }
    } else {
      return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated, action });
  } catch (error) {
    console.error("[POST /api/tasks/bulk]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
