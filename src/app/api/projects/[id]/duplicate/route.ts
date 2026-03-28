import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(user, PERMISSIONS.PROJECTS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Originalprojekt laden
    const original = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            // Keine Zeiterfassung/Kommentare
          },
        },
        milestones: {
          select: {
            title: true,
            description: true,
            status: true,
            progress: true,
            color: true,
            dueDate: true,
          },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Zugriffscheck für Non-Admins
    if (user.role !== "admin" && !user.projectAccess.includes(id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = format(new Date(), "dd.MM.yyyy", { locale: de });
    const newName = `${original.name} (Kopie ${today})`;

    // Neues Projekt erstellen
    const duplicate = await prisma.project.create({
      data: {
        name: newName,
        description: original.description,
        longDescription: null, // nicht übernehmen
        status: "planning",    // frisch starten
        progress: 0,
        priority: original.priority,
        color: original.color,
        stack: original.stack,
        githubRepo: null,      // nicht übernehmen
        liveUrl: null,
        vercelUrl: null,
        expoProjectId: null,
        budget: original.budget,
        archived: false,
      },
    });

    // Tasks duplizieren (Status auf "todo" zurücksetzen, Termine übernehmen)
    if (original.tasks.length > 0) {
      await prisma.task.createMany({
        data: original.tasks.map((task) => ({
          title: task.title,
          description: task.description,
          status: "todo",          // immer zurücksetzen
          priority: task.priority,
          dueDate: task.dueDate,
          projectId: duplicate.id,
          // assigneeId: null,     // keine Zuweisungen kopieren
        })),
      });
    }

    // Meilensteine duplizieren (Status auf "planned" zurücksetzen)
    if (original.milestones.length > 0) {
      await prisma.milestone.createMany({
        data: original.milestones.map((ms) => ({
          title: ms.title,
          description: ms.description,
          status: "planned",       // immer zurücksetzen
          progress: 0,
          color: ms.color,
          dueDate: ms.dueDate,
          projectId: duplicate.id,
        })),
      });
    }

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "project",
        entityId: duplicate.id,
        entityName: duplicate.name,
        projectId: duplicate.id,
        userId: user.id,
        metadata: {
          duplicatedFrom: original.id,
          duplicatedFromName: original.name,
        } as any,
      },
    }).catch(() => {});

    // Vollständiges Projekt mit Counts zurückgeben
    const result = await prisma.project.findUnique({
      where: { id: duplicate.id },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        project: result,
        tasksCreated: original.tasks.length,
        milestonesCreated: original.milestones.length,
        message: `Projekt dupliziert: "${newName}"`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/projects/[id]/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
