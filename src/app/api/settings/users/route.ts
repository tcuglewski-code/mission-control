import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromDb } from "@/lib/api-auth";

/**
 * GET /api/settings/users
 * Returns all users with their roles and last activity.
 * Admin only.
 */
export async function GET() {
  const admin = await requireAdminFromDb();
  if (!admin) {
    return NextResponse.json({ error: "Nur Administratoren haben Zugriff" }, { status: 403 });
  }

  const users = await prisma.authUser.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      projectAccess: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Add default values for new fields (handled gracefully)
  const usersWithDefaults = users.map((u) => ({
    ...u,
    mcRole: (u as any).mcRole ?? "entwickler",
    active: (u as any).active ?? true,
    lastLoginAt: (u as any).lastLoginAt ?? null,
  }));

  return NextResponse.json(usersWithDefaults);
}
