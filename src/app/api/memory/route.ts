import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const type = searchParams.get("type");

    const entries = await prisma.memoryEntry.findMany({
      where: {
        ...(category && category !== "all" ? { category } : {}),
        ...(type && type !== "all" ? { type } : {}),
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[GET /api/memory]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, category, tags, source, projectId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const type = body.type ?? "journal";

    const entry = await prisma.memoryEntry.create({
      data: {
        title,
        content,
        category: category ?? "general",
        type,
        tags,
        source,
        projectId,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "memory",
        entityId: entry.id,
        entityName: entry.title,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[POST /api/memory]", error);
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

    const entry = await prisma.memoryEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.source !== undefined && { source: data.source }),
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[PUT /api/memory]", error);
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

    await prisma.memoryEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/memory]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
