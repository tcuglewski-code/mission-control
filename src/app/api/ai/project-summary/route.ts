import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { isAiAvailable, generateProjectSummary } from "@/lib/ai";

/**
 * POST /api/ai/project-summary
 * Body: { projectId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAiAvailable()) {
      return NextResponse.json(
        { error: "KI nicht verfügbar — ANTHROPIC_API_KEY fehlt.", aiAvailable: false },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            description: true,
          },
          take: 50,
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    const summary = await generateProjectSummary({
      projectName: project.name,
      projectDescription: project.description,
      status: project.status,
      tasks: project.tasks,
      projectId: project.id,
    });

    return NextResponse.json({ summary, aiAvailable: true });
  } catch (error: any) {
    console.error("[POST /api/ai/project-summary]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
