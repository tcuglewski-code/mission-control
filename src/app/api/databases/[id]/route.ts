import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serializeDb(db: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(db, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, host, port, status, sizeBytes, lastBackup, projectId } = body;

    const db = await prisma.database.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(host !== undefined && { host }),
        ...(port !== undefined && { port: port ? Number(port) : null }),
        ...(status !== undefined && { status }),
        ...(sizeBytes !== undefined && { sizeBytes: sizeBytes ? BigInt(sizeBytes) : null }),
        ...(lastBackup !== undefined && { lastBackup: lastBackup ? new Date(lastBackup) : null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(serializeDb(db));
  } catch (error) {
    console.error("[PATCH /api/databases/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await prisma.database.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        action: "deleted",
        entityType: "database",
        entityId: db.id,
        entityName: db.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/databases/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
