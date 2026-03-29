import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/search?q=...&types=tasks,projects,documents,invoices
 * Unified Search über alle Entitäten
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const typesParam = searchParams.get("types") ?? "tasks,projects,documents,invoices";
    const types = typesParam.split(",");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    const results: Array<{
      id: string;
      type: "task" | "project" | "document" | "invoice" | "comment";
      title: string;
      subtitle?: string;
      meta?: string;
      url: string;
      status?: string;
      priority?: string;
      project?: { id: string; name: string; color: string } | null;
    }> = [];

    // ─── Tasks ────────────────────────────────────────────────────────────────
    if (types.includes("tasks")) {
      const tasks = await prisma.task.findMany({
        where: {
          ...accessFilter,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      });

      for (const t of tasks) {
        results.push({
          id: t.id,
          type: "task",
          title: t.title,
          subtitle: t.description
            ? t.description.slice(0, 80) + (t.description.length > 80 ? "…" : "")
            : undefined,
          meta: t.assignee?.name,
          url: `/tasks?highlight=${t.id}`,
          status: t.status,
          priority: t.priority,
          project: t.project,
        });
      }

      // Tasks via Kommentare
      const commentMatches = await prisma.taskComment.findMany({
        where: { content: { contains: q, mode: "insensitive" } },
        select: { taskId: true, content: true },
        take: 10,
      });
      const commentTaskIds = [...new Set(commentMatches.map((c) => c.taskId))];
      const existingTaskIds = new Set(tasks.map((t) => t.id));
      const newIds = commentTaskIds.filter((id) => !existingTaskIds.has(id));

      if (newIds.length > 0) {
        const tasksViaComments = await prisma.task.findMany({
          where: { id: { in: newIds }, ...accessFilter },
          include: {
            project: { select: { id: true, name: true, color: true } },
            assignee: { select: { id: true, name: true } },
          },
          take: 5,
        });
        for (const t of tasksViaComments) {
          const cm = commentMatches.find((c) => c.taskId === t.id);
          results.push({
            id: `comment-${t.id}`,
            type: "comment",
            title: t.title,
            subtitle: cm
              ? cm.content.slice(0, 80) + (cm.content.length > 80 ? "…" : "")
              : undefined,
            url: `/tasks?highlight=${t.id}`,
            status: t.status,
            project: t.project,
          });
        }
      }
    }

    // ─── Projekte ─────────────────────────────────────────────────────────────
    if (types.includes("projects")) {
      const projectAccessFilter =
        user.role !== "admin"
          ? { members: { some: { userId: user.id } } }
          : {};
      const projects = await prisma.project.findMany({
        where: {
          ...projectAccessFilter,
          archived: false,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      });
      for (const p of projects) {
        results.push({
          id: p.id,
          type: "project",
          title: p.name,
          subtitle: p.description
            ? p.description.slice(0, 80) + (p.description.length > 80 ? "…" : "")
            : undefined,
          meta: p.status,
          url: `/projects/${p.id}`,
          status: p.status,
          project: { id: p.id, name: p.name, color: p.color },
        });
      }
    }

    // ─── Dokumente ────────────────────────────────────────────────────────────
    if (types.includes("documents")) {
      const docs = await prisma.document.findMany({
        where: {
          ...accessFilter,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      });
      for (const d of docs) {
        results.push({
          id: d.id,
          type: "document",
          title: d.title,
          subtitle: d.content
            ? d.content.replace(/<[^>]+>/g, "").slice(0, 80) + "…"
            : undefined,
          url: `/docs/${d.id}`,
          project: d.project,
        });
      }
    }

    // ─── Rechnungen ───────────────────────────────────────────────────────────
    if (types.includes("invoices")) {
      const invoices = await prisma.invoice.findMany({
        where: {
          ...accessFilter,
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      });
      for (const inv of invoices) {
        results.push({
          id: inv.id,
          type: "invoice",
          title: `${inv.invoiceNumber} — ${inv.clientName}`,
          subtitle: `${inv.totalAmount?.toFixed(2) ?? "0.00"} €`,
          meta: inv.status,
          url: `/finance?invoice=${inv.id}`,
          status: inv.status,
          project: inv.project,
        });
      }
    }

    return NextResponse.json({ results, query: q, total: results.length });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
