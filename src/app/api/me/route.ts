import { NextRequest, NextResponse } from "next/server";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * GET /api/me
 * Returns the current user's fresh data from DB (role, permissions, etc.)
 * Used by client components (e.g. Sidebar) to display the correct role.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    projectAccess: user.projectAccess,
  });
}
