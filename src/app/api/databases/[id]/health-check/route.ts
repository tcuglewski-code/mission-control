import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

function serializeDb(db: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(db, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

// Simulated health check — checks if host/port is reachable logic
// For now: randomly returns connected/disconnected based on config completeness
function simulateHealthCheck(type: string, host: string | null): "connected" | "disconnected" {
  // Neon & WatermelonDB are always "connected" (embedded/cloud)
  if (type === "watermelondb") return "connected";
  if (type === "neon") return "connected";
  // Others: connected if host is set
  if (host && host.length > 0) return "connected";
  return "disconnected";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.database.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    const newStatus = simulateHealthCheck(existing.type, existing.host);

    const db = await prisma.database.update({
      where: { id },
      data: {
        status: newStatus,
        lastChecked: new Date(),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "health_check",
        entityType: "database",
        entityId: db.id,
        entityName: db.name,
        metadata: JSON.stringify({ status: newStatus }),
      },
    });

    return NextResponse.json({ status: newStatus, db: serializeDb(db) });
  } catch (error) {
    console.error("[POST /api/databases/[id]/health-check]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
