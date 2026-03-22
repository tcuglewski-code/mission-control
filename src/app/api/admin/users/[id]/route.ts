import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.authUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { role, projectAccess, email } = body;

  const user = await prisma.authUser.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(projectAccess !== undefined && { projectAccess }),
      ...(email !== undefined && { email }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      projectAccess: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
