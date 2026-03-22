import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user, PERMISSIONS.MEMORY_WRITE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, content, type = "note" } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "title and content required" }, { status: 400 });

  const entry = await prisma.memoryEntry.create({
    data: { title, content, type },
  });
  return NextResponse.json(entry);
}
