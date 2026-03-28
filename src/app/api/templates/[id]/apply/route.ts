import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId ist erforderlich" }, { status: 400 });
    }

    // Vorlage laden
    const template = await prisma.projectTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }

    // Projekt prüfen
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Tasks aus Vorlage erstellen
    const templateTasks = template.tasks as Array<{
      title: string;
      description?: string;
      priority?: string;
    }>;

    const createdTasks = await Promise.all(
      templateTasks.map((taskDef) =>
        prisma.task.create({
          data: {
            title: taskDef.title,
            description: taskDef.description || null,
            status: "todo",
            priority: taskDef.priority ?? "medium",
            projectId,
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: `${createdTasks.length} Tasks aus Vorlage "${template.name}" erstellt`,
        tasks: createdTasks,
        templateName: template.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/templates/[id]/apply]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
