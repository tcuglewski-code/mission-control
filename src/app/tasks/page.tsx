import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { KanbanBoardWrapper } from "./KanbanBoardWrapper";

export default async function TasksPage() {
  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true, color: true, status: true, progress: true, priority: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell title="Aufgaben" subtitle="Kanban Board">
      <div className="p-6 h-full">
        <KanbanBoardWrapper
          initialTasks={tasks}
          projects={projects}
          users={users}
        />
      </div>
    </AppShell>
  );
}
