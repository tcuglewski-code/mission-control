import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const databases = await prisma.database.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(databases);
  } catch (error) {
    console.error("[GET /api/databases]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
