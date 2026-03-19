import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [projects, databases] = await Promise.all([
      prisma.project.findMany({
        select: { id: true, name: true, color: true, status: true, description: true },
        orderBy: { name: "asc" },
      }),
      prisma.database.findMany({
        select: { id: true, name: true, type: true, status: true, projectId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ projects, databases });
  } catch (error) {
    console.error("[GET /api/diagram]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
