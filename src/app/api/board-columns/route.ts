import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// Standard-Spalten falls keine in DB vorhanden
const DEFAULT_COLUMNS = [
  { name: "Todo", statusKey: "todo", order: 0, color: "#6b7280" },
  { name: "In Bearbeitung", statusKey: "in_progress", order: 1, color: "#f97316" },
  { name: "Review", statusKey: "review", order: 2, color: "#3b82f6" },
  { name: "Fertig", statusKey: "done", order: 3, color: "#10b981" },
];

export async function GET(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const columns = await prisma.boardColumn.findMany({
    where: projectId
      ? { OR: [{ projectId }, { projectId: null }] }
      : { projectId: null },
    orderBy: { order: "asc" },
  });

  // Wenn keine Spalten vorhanden → Defaults zurückgeben (ohne Speichern)
  if (columns.length === 0) {
    return NextResponse.json(
      DEFAULT_COLUMNS.map((c) => ({
        id: `default-${c.statusKey}`,
        ...c,
        projectId: null,
        wipLimit: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
  }

  return NextResponse.json(columns);
}

export async function POST(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Nur Admins können Spalten erstellen" }, { status: 403 });
  }

  const body = await req.json();
  const { name, statusKey, order, wipLimit, color, projectId } = body;

  if (!name || !statusKey) {
    return NextResponse.json({ error: "Name und StatusKey erforderlich" }, { status: 400 });
  }

  const column = await prisma.boardColumn.create({
    data: {
      name,
      statusKey,
      order: order ?? 0,
      wipLimit: wipLimit != null ? parseInt(String(wipLimit)) : null,
      color: color ?? "#6b7280",
      projectId: projectId ?? null,
    },
  });

  return NextResponse.json(column, { status: 201 });
}
