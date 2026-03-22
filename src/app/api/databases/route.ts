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
    const projectId = searchParams.get("projectId");

    // Non-admins sehen nur Datenbanken aus erlaubten Projekten
    const accessFilter =
      user.role !== "admin"
        ? { OR: [{ projectId: null }, { projectId: { in: user.projectAccess } }] }
        : undefined;

    const databases = await prisma.database.findMany({
      where: {
        ...accessFilter,
        ...(projectId
          ? user.role !== "admin" && !user.projectAccess.includes(projectId)
            ? { id: "__none__" }
            : { projectId }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(databases.map(serializeDb));
  } catch (error) {
    console.error("[GET /api/databases]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, host, port, projectId, sizeBytes, lastBackup } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name und Typ sind erforderlich" }, { status: 400 });
    }

    const db = await prisma.database.create({
      data: {
        name,
        type,
        host: host || null,
        port: port ? Number(port) : null,
        projectId: projectId || null,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        lastBackup: lastBackup ? new Date(lastBackup) : null,
        status: "unknown",
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "database",
        entityId: db.id,
        entityName: db.name,
      },
    });

    return NextResponse.json(serializeDb(db), { status: 201 });
  } catch (error) {
    console.error("[POST /api/databases]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// BigInt serialization helper
function serializeDb(db: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(db, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
