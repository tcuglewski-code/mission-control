import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromDb } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminFromDb();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.authUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminFromDb();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { role, projectAccess, email, permissions } = body;

  const user = await prisma.authUser.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(projectAccess !== undefined && { projectAccess }),
      ...(email !== undefined && { email }),
      ...(permissions !== undefined && { permissions }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      projectAccess: true,
      permissions: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
