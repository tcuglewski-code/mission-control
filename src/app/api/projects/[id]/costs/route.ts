import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/projects/[id]/costs
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: projectId } = await params;

    // Projekt-Infos + Budget
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, budget: true, budgetUsed: true, color: true },
    });
    if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

    // Manuelle Kostenpositionen
    const costs = await prisma.projectCost.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    });

    // Zeiterfassungs-Einträge für Personalkosten (Tasks dieses Projekts)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        task: { projectId },
        endTime: { not: null },
        duration: { not: null },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            assignee: { select: { id: true, name: true, hourlyRate: true } },
          },
        },
      },
    });

    // AuthUser Stundensätze für TimeEntry.userId (falls kein Assignee)
    const authUserIds = timeEntries
      .filter((te) => te.userId && !te.task.assignee)
      .map((te) => te.userId as string);
    const authUsers =
      authUserIds.length > 0
        ? await prisma.authUser.findMany({
            where: { id: { in: authUserIds } },
            select: { id: true, username: true, hourlyRate: true },
          })
        : [];
    const authUserMap = new Map(authUsers.map((u) => [u.id, u]));

    // Team-Mitglieder mit Stundensatz
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, hourlyRate: true } } },
    });

    return NextResponse.json({ project, costs, timeEntries, members, authUserMap: Object.fromEntries(authUserMap) });
  } catch (err) {
    console.error("[GET /api/projects/[id]/costs]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/costs — neue Kostenposition erstellen
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: projectId } = await params;
    const body = await req.json();
    const { category, amount, description, date } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Ungültiger Betrag" }, { status: 400 });
    }

    const cost = await prisma.projectCost.create({
      data: {
        projectId,
        category: category ?? "Sonstiges",
        amount: Number(amount),
        description: description ?? null,
        date: date ? new Date(date) : new Date(),
      },
    });

    // budgetUsed automatisch aktualisieren
    const allCosts = await prisma.projectCost.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: allCosts._sum.amount ?? 0 },
    });

    return NextResponse.json(cost, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects/[id]/costs]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
