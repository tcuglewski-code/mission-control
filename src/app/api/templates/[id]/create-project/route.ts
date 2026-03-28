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
    const {
      projectName,
      projectDescription,
      color = "#22c55e",
      startDate,       // ISO string — Startdatum für relative Task-Verschiebung
      assigneeIds = [], // Array von User-IDs die allen Tasks zugewiesen werden
    } = body;

    if (!projectName) {
      return NextResponse.json({ error: "Projektname ist erforderlich" }, { status: 400 });
    }

    const template = await prisma.projectTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

    const templateTasks = template.tasks as Array<{
      title: string;
      description?: string;
      priority?: string;
      offsetDays?: number;
    }>;

    const baseDate = startDate ? new Date(startDate) : new Date();

    // Projekt erstellen
    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDescription || template.description || null,
        color,
        status: "active",
      },
    });

    // Hauptassignee (erster in der Liste) oder null
    const primaryAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : null;

    // Verify assignees exist
    let validAssigneeIds: string[] = [];
    if (assigneeIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true },
      });
      validAssigneeIds = users.map((u) => u.id);
    }

    // Tasks erstellen mit relativen Datums-Offsets
    const createdTasks = await Promise.all(
      templateTasks.map(async (taskDef) => {
        let dueDate: Date | null = null;
        if (taskDef.offsetDays !== undefined) {
          dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + taskDef.offsetDays);
        }

        const assigneeId = validAssigneeIds.length > 0 ? validAssigneeIds[0] : null;

        return prisma.task.create({
          data: {
            title: taskDef.title,
            description: taskDef.description || null,
            status: "todo",
            priority: taskDef.priority ?? "medium",
            projectId: project.id,
            dueDate,
            assigneeId,
          },
        });
      })
    );

    // Weitere Assignees als Projekt-Mitglieder hinzufügen
    if (validAssigneeIds.length > 0) {
      await prisma.projectMember.createMany({
        data: validAssigneeIds.map((uid) => ({
          projectId: project.id,
          userId: uid,
          role: "member",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(
      {
        project,
        tasksCreated: createdTasks.length,
        message: `Projekt "${project.name}" mit ${createdTasks.length} Tasks aus Vorlage "${template.name}" erstellt`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/templates/[id]/create-project]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
