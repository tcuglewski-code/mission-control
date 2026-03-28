import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { isAiAvailable, generateTaskDescription } from "@/lib/ai";

/**
 * POST /api/ai/task-description
 * Body: { title: string; projectId?: string }
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
    const { title, projectId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Titel fehlt" }, { status: 400 });
    }

    let projectName: string | undefined;
    let projectDescription: string | null | undefined;
    let existingTasks: Array<{ title: string; status: string }> | undefined;

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: {
            select: { title: true, status: true },
            take: 15,
            orderBy: { updatedAt: "desc" },
          },
        },
      });
      if (project) {
        projectName = project.name;
        projectDescription = project.description;
        existingTasks = project.tasks;
      }
    }

    const description = await generateTaskDescription({
      title,
      projectName,
      projectDescription,
      existingTasks,
    });

    return NextResponse.json({ description, aiAvailable: true });
  } catch (error: any) {
    console.error("[POST /api/ai/task-description]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
