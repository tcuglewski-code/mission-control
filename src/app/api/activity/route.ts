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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const type = searchParams.get("type") ?? undefined; // "created" | "commented" | "status_changed" | "reaction" | ...

    // Zugriffskontrolle: Non-admins sehen nur ihre freigegebenen Projekte
    const accessFilter =
      user.role !== "admin"
        ? user.projectAccess.length > 0
          ? { projectId: { in: user.projectAccess } }
          : { id: "__none__" }
        : undefined;

    const andClauses: object[] = [];

    if (accessFilter) andClauses.push(accessFilter);

    if (projectId) {
      if (user.role !== "admin" && !user.projectAccess.includes(projectId)) {
        andClauses.push({ id: "__none__" });
      } else {
        andClauses.push({ projectId });
      }
    }

    if (userId) {
      andClauses.push({ userId });
    }

    if (type) {
      // Typ-Filter: mappt auf action-Werte
      const actionMap: Record<string, string[]> = {
        created: ["created"],
        commented: ["commented"],
        status_changed: ["status_changed", "completed", "done"],
        reaction: ["reaction"],
        updated: ["updated"],
        deleted: ["deleted"],
      };
      const actions = actionMap[type] ?? [type];
      andClauses.push({ action: { in: actions } });
    }

    const whereClause = andClauses.length > 0 ? { AND: andClauses } : {};

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, avatar: true } },
        project: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 um nextCursor zu ermitteln
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | undefined;
    if (logs.length > limit) {
      const last = logs.pop();
      nextCursor = last?.id;
    }

    return NextResponse.json({
      logs,
      nextCursor: nextCursor ?? null,
    });
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
