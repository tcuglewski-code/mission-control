import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/projects/budgets — Top 5 Projekte nach Budget-Auslastung
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const accessFilter =
      user.role !== "admin" ? { id: { in: user.projectAccess } } : {};

    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        budget: { not: null },
        ...accessFilter,
      },
      select: {
        id: true,
        name: true,
        color: true,
        budget: true,
        budgetUsed: true,
        status: true,
      },
      orderBy: { budget: "desc" },
    });

    // Sortiere nach Budget-Auslastung (% höchste zuerst)
    const sorted = projects
      .filter((p) => p.budget && p.budget > 0)
      .map((p) => ({
        ...p,
        pct: p.budget ? Math.round(((p.budgetUsed ?? 0) / p.budget) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    return NextResponse.json(sorted);
  } catch (err) {
    console.error("[GET /api/projects/budgets]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
