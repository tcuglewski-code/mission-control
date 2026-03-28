import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// DELETE /api/projects/[id]/costs/[costId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: projectId, costId } = await params;

    await prisma.projectCost.delete({ where: { id: costId } });

    // budgetUsed aktualisieren
    const allCosts = await prisma.projectCost.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: allCosts._sum.amount ?? 0 },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]/costs/[costId]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/costs/[costId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: projectId, costId } = await params;
    const body = await req.json();
    const { category, amount, description, date } = body;

    const updated = await prisma.projectCost.update({
      where: { id: costId },
      data: {
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    });

    // budgetUsed aktualisieren
    const allCosts = await prisma.projectCost.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: allCosts._sum.amount ?? 0 },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/costs/[costId]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
