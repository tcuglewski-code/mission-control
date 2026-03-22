import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");

    // Non-admins sehen nur Dokumente aus erlaubten Projekten
    const accessFilter =
      user.role !== "admin"
        ? { OR: [{ projectId: null }, { projectId: { in: user.projectAccess } }] }
        : undefined;

    const docs = await prisma.document.findMany({
      where: {
        ...accessFilter,
        ...(type && type !== "all" ? { type } : {}),
        // If a specific projectId is requested, make sure user has access
        ...(projectId
          ? user.role !== "admin" && !user.projectAccess.includes(projectId)
            ? { id: "__none__" } // returns empty result if no access
            : { projectId }
          : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { content: { contains: search } },
                { tags: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[GET /api/docs]", error);
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
    const { title, content, type, tags, projectId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Non-admins can only create docs for projects they have access to
    if (projectId && user.role !== "admin" && !user.projectAccess.includes(projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await prisma.document.create({
      data: {
        title,
        content,
        type: type ?? "doc",
        tags,
        projectId: projectId || null,
      },
      include: { project: { select: { name: true } } },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "document",
        entityId: doc.id,
        entityName: doc.title,
        projectId: doc.projectId,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("[POST /api/docs]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Non-admins can only edit docs from their projects
    if (
      user.role !== "admin" &&
      existing.projectId &&
      !user.projectAccess.includes(existing.projectId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content, version: existing.version + 1 }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.projectId !== undefined && { projectId: data.projectId || null }),
      },
      include: { project: { select: { name: true } } },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("[PUT /api/docs]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Non-admins can only delete docs from their projects
    if (user.role !== "admin") {
      const doc = await prisma.document.findUnique({ where: { id } });
      if (doc?.projectId && !user.projectAccess.includes(doc.projectId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/docs]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
