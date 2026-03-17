import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const tools = await prisma.tool.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
        ...(type && type !== "all" ? { type } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tools);
  } catch (error) {
    console.error("[GET /api/tools]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, type, status, config, projectIds } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const tool = await prisma.tool.create({
      data: {
        name,
        description,
        type: type ?? "api",
        status: status ?? "active",
        config: config ? JSON.stringify(config) : null,
        projectIds,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "tool",
        entityId: tool.id,
        entityName: tool.name,
      },
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tools]", error);
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

    const tool = await prisma.tool.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.config !== undefined && { config: typeof data.config === "string" ? data.config : JSON.stringify(data.config) }),
        ...(data.projectIds !== undefined && { projectIds: data.projectIds }),
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.error("[PUT /api/tools]", error);
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

    await prisma.tool.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tools]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
