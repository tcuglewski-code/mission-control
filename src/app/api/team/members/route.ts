import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/team/members?id=xxx — Mitglied-Profil mit Tasks und Aktivität
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.TEAM_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

    const member = await prisma.user.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            project: { select: { id: true, name: true, color: true } },
            sprint: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const openTasks = member.tasks.filter((t: { status: string }) => t.status !== "done");
    const doneTasks = member.tasks.filter((t: { status: string }) => t.status === "done");

    return NextResponse.json({
      ...member,
      openTasks,
      doneTasks,
      auslastung: member.tasks.length > 0 ? Math.round((openTasks.length / member.tasks.length) * 100) : 0,
    });
  } catch (error) {
    console.error("[GET /api/team/members]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/team/members — Kapazität aktualisieren
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, weeklyCapacity } = body;
    if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id },
      data: { weeklyCapacity: weeklyCapacity ?? 40 },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/team/members]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
