import { NextRequest, NextResponse } from "next/server";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/me
 * Returns the current user's fresh data from DB (role, permissions, etc.)
 * Used by client components (e.g. Sidebar, usePermission) to display the correct role.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load fresh from DB to include new fields
  const dbUser = await prisma.authUser.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role,
    mcRole: (dbUser as any).mcRole ?? "entwickler",
    active: (dbUser as any).active ?? true,
    permissions: dbUser.permissions,
    projectAccess: dbUser.projectAccess,
    notifEmailDigest: (dbUser as any).notifEmailDigest ?? true,
    notifPush: (dbUser as any).notifPush ?? false,
  });
}
