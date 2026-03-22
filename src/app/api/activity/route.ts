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

    // Non-admins sehen nur Logs aus ihren erlaubten Projekten
    // Kein Fallback auf null-Projekte für eingeschränkte User
    const accessFilter =
      user.role !== "admin"
        ? user.projectAccess.length > 0
          ? { projectId: { in: user.projectAccess } }
          : { id: "__none__" } // no access at all → empty result
        : undefined;

    // Build AND clauses to avoid OR-overwrite issues
    const andClauses: object[] = [];
    if (accessFilter) andClauses.push(accessFilter);
    if (projectId) {
      if (user.role !== "admin" && !user.projectAccess.includes(projectId)) {
        andClauses.push({ id: "__none__" });
      } else {
        andClauses.push({ projectId });
      }
    }

    const logs = await prisma.activityLog.findMany({
      where: andClauses.length > 0 ? { AND: andClauses } : {},
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
