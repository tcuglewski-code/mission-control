import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, description, category } = body;

    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // Projekt mit Tasks und Meilensteinen laden
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
          select: {
            title: true,
            description: true,
            priority: true,
            labels: true,
            milestoneId: true,
          },
        },
        milestones: {
          select: { id: true, title: true, description: true, color: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Tasks bereinigen: keine Daten, keine Zuweisungen, Milestone-Name statt ID
    const milestoneMap = new Map(project.milestones.map((m) => [m.id, m.title]));

    const templateTasks = project.tasks.map((task, index) => ({
      title: task.title,
      description: task.description || undefined,
      priority: task.priority || "medium",
      offsetDays: index * 7, // Standard-Offset: je Task +7 Tage
      ...(task.milestoneId ? { milestoneHint: milestoneMap.get(task.milestoneId) } : {}),
      ...(task.labels ? { labels: task.labels } : {}),
    }));

    // Meilensteine als Metadaten speichern
    const milestoneStructure = project.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      color: m.color,
    }));

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        description: description || project.description || null,
        category: category || null,
        tasks: templateTasks,
        isSystem: false,
        createdBy: user.id,
        createdByName: user.name || user.email || "Unbekannt",
      },
    });

    return NextResponse.json(
      {
        template,
        message: `Vorlage "${name}" mit ${templateTasks.length} Tasks erstellt`,
        milestones: milestoneStructure,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/projects/[id]/save-as-template]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
