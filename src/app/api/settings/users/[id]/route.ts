import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromDb } from "@/lib/api-auth";
import { ROLE_PERMISSIONS, type McRole } from "@/lib/permissions";

/**
 * PATCH /api/settings/users/[id]
 * Update user role, mcRole, active status, permissions.
 * Admin only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await requireAdminFromDb();
    if (!admin) {
      return NextResponse.json({ error: "Nur Administratoren haben Zugriff" }, { status: 403 });
    }

    const body = await req.json();
    const { mcRole, active, role, permissions, projectAccess } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (mcRole !== undefined) {
      const validRoles: McRole[] = ["admin", "projektmanager", "entwickler", "beobachter"];
      if (!validRoles.includes(mcRole)) {
        return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
      }
      updateData.mcRole = mcRole;
      // Sync system role if mcRole is admin
      if (mcRole === "admin") {
        updateData.role = "admin";
      } else if ((await prisma.authUser.findUnique({ where: { id } }))?.role === "admin" && mcRole !== "admin") {
        // Downgrade from admin to user if mcRole is not admin
        updateData.role = "user";
      }
      // Auto-set permissions based on role (if not explicitly provided)
      if (permissions === undefined) {
        updateData.permissions = ROLE_PERMISSIONS[mcRole as McRole] ?? [];
      }
    }

    if (active !== undefined) {
      updateData.active = active;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }

    if (projectAccess !== undefined) {
      updateData.projectAccess = projectAccess;
    }

    const updated = await prisma.authUser.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      ...updated,
      mcRole: (updated as any).mcRole ?? "entwickler",
      active: (updated as any).active ?? true,
    });
  } catch (e) {
    console.error("[settings/users] PATCH error:", e);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
