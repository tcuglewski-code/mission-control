import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/tasks/search?q=...
 * Erweiterte Volltext-Suche: Titel, Beschreibung, Kommentare
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    // 1. Tasks via Titel + Beschreibung suchen (Prisma contains, case-insensitive via mode)
    const tasksByContent = await prisma.task.findMany({
      where: {
        ...accessFilter,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { agentPrompt: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    // 2. Tasks via Kommentare suchen
    const commentMatches = await prisma.taskComment.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
      },
      select: {
        taskId: true,
        content: true,
      },
      take: 20,
    });

    const commentTaskIds = [...new Set(commentMatches.map((c) => c.taskId))];
    const tasksByComments = await prisma.task.findMany({
      where: {
        id: { in: commentTaskIds },
        ...accessFilter,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
      },
      take: 10,
    });

    // Merge + deduplizieren
    const allTasksMap = new Map<string, typeof tasksByContent[0]>();
    for (const t of [...tasksByContent, ...tasksByComments]) {
      if (!allTasksMap.has(t.id)) {
        allTasksMap.set(t.id, t);
      }
    }

    // Ergebnis aufbereiten mit Match-Typ und Vorschau
    const results = Array.from(allTasksMap.values()).map((task) => {
      // Matchtyp bestimmen
      const titleMatch = task.title.toLowerCase().includes(q.toLowerCase());
      const descMatch = task.description?.toLowerCase().includes(q.toLowerCase());
      const commentMatch = commentTaskIds.includes(task.id);

      let matchType: "title" | "description" | "comment" = "title";
      if (!titleMatch && descMatch) matchType = "description";
      else if (!titleMatch && !descMatch && commentMatch) matchType = "comment";

      // Beschreibungs-Vorschau (erste 100 Zeichen)
      const descPreview = task.description
        ? task.description.slice(0, 100) + (task.description.length > 100 ? "…" : "")
        : null;

      // Kommentar-Vorschau wenn kein Titel/Desc-Match
      let commentPreview: string | null = null;
      if (commentMatch && matchType === "comment") {
        const matchingComment = commentMatches.find((c) => c.taskId === task.id);
        if (matchingComment) {
          commentPreview = matchingComment.content.slice(0, 100) + (matchingComment.content.length > 100 ? "…" : "");
        }
      }

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        project: task.project,
        assignee: task.assignee,
        taskLabels: task.taskLabels,
        descPreview,
        commentPreview,
        matchType,
      };
    });

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error("[GET /api/tasks/search]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
