import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");

    const docs = await prisma.document.findMany({
      where: {
        ...(type && type !== "all" ? { type } : {}),
        ...(projectId ? { projectId } : {}),
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
    const body = await req.json();
    const { title, content, type, tags, projectId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
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
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/docs]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
