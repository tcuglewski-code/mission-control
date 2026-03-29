import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { KanbanBoardWrapper } from "./KanbanBoardWrapper";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Suspense } from "react";

export default async function TasksPage() {
  // Auth check — load session and user fresh from DB
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const authUser = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (!authUser) redirect("/login");

  // Non-admins without tasks.view permission see no tasks
  if (!hasPermission(authUser, PERMISSIONS.TASKS_VIEW)) {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return (
      <AppShell title="Aufgaben" subtitle="Kanban Board">
        <div className="p-6 h-full">
          <Suspense fallback={null}>
            <KanbanBoardWrapper initialTasks={[]} projects={[]} users={users} />
          </Suspense>
        </div>
      </AppShell>
    );
  }

  // Admins see all tasks; non-admins only tasks from their accessible projects.
  // Empty projectAccess → no tasks visible.
  const taskWhere =
    authUser.role !== "admin"
      ? { projectId: { in: authUser.projectAccess } }
      : {};

  const projectWhere =
    authUser.role !== "admin"
      ? { id: { in: authUser.projectAccess } }
      : {};

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
        subtasks: { select: { id: true, status: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        progress: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell title="Aufgaben" subtitle="Kanban Board">
      <div className="p-6 h-full">
        <Suspense fallback={null}>
          <KanbanBoardWrapper
            initialTasks={tasks}
            projects={projects}
            users={users}
            isAdmin={authUser.role === "admin"}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
