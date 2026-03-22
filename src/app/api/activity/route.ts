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
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const projectId = searchParams.get("projectId");

    // Non-admins sehen nur Logs aus erlaubten Projekten
    const accessFilter =
      user.role !== "admin"
        ? { OR: [{ projectId: null }, { projectId: { in: user.projectAccess } }] }
        : undefined;

    const logs = await prisma.activityLog.findMany({
      where: {
        ...accessFilter,
        ...(projectId
          ? user.role !== "admin" && !user.projectAccess.includes(projectId)
            ? { id: "__none__" }
            : { projectId }
          : {}),
      },
      include: {
        user: { select: { name: true, avatar: true } },
        project: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[GET /api/activity]", error);
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
    const { action, entityType, entityId, entityName, userId, projectId, metadata } = body;

    if (!action || !entityType || !entityId || !entityName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const log = await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        entityName,
        userId: userId || null,
        projectId: projectId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("[POST /api/activity]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
