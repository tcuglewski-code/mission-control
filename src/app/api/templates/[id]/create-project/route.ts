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
      client,          // Kunde (optional)
      color = "#22c55e",
      startDate,       // ISO string — Startdatum für relative Task-Verschiebung
      budget,          // Budget in € (optional)
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

    const templateMilestones = (template.milestones as Array<{
      title: string;
      description?: string;
      offsetDays?: number;
      color?: string;
    }> | null) ?? [];

    const baseDate = startDate ? new Date(startDate) : new Date();

    // Projekt erstellen
    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDescription || template.description || null,
        color,
        status: "active",
        ...(budget ? { budget: parseFloat(budget) } : {}),
      },
    });

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

    // Meilensteine erstellen
    let milestonesCreated = 0;
    if (templateMilestones.length > 0) {
      const milestoneResults = await Promise.all(
        templateMilestones.map(async (msDef) => {
          let dueDate: Date | null = null;
          if (msDef.offsetDays !== undefined) {
            dueDate = new Date(baseDate);
            dueDate.setDate(dueDate.getDate() + msDef.offsetDays);
          }
          return prisma.milestone.create({
            data: {
              title: msDef.title,
              description: msDef.description || null,
              status: "planned",
              progress: 0,
              color: msDef.color || "#8b5cf6",
              dueDate,
              projectId: project.id,
            },
          });
        })
      );
      milestonesCreated = milestoneResults.length;
    }

    // Team-Mitglieder hinzufügen
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

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "project",
        entityId: project.id,
        entityName: project.name,
        projectId: project.id,
        userId: user.id,
        metadata: {
          fromTemplate: template.name,
          tasksCreated: createdTasks.length,
          milestonesCreated,
        } as any,
      },
    }).catch(() => {}); // Non-blocking

    return NextResponse.json(
      {
        project,
        tasksCreated: createdTasks.length,
        milestonesCreated,
        message: `Projekt "${project.name}" mit ${createdTasks.length} Tasks und ${milestonesCreated} Meilensteinen aus Vorlage "${template.name}" erstellt`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/templates/[id]/create-project]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
