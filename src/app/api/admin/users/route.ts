import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromDb } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const admin = await requireAdminFromDb();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminFromDb();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { username, email, password, role, projectAccess } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password required" },
      { status: 400 }
    );
  }

  const exists = await prisma.authUser.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.authUser.create({
    data: {
      username,
      email,
      passwordHash,
      role: role ?? "user",
      projectAccess: projectAccess ?? [],
      permissions: [],
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

  return NextResponse.json(user, { status: 201 });
}
