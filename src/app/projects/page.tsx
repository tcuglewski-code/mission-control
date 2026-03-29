import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsClient } from "./ProjectsClient";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { calculateHealthScore } from "@/lib/health-score";

export default async function ProjectsPage() {
  // Auth check — load session and user fresh from DB
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const authUser = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (!authUser) redirect("/login");

  // Non-admins without projects.view permission see nothing
  if (!hasPermission(authUser, PERMISSIONS.PROJECTS_VIEW)) {
    return (
      <AppShell title="Projekte" subtitle="Alle Projekte">
        <div className="p-6">
          <ProjectsClient initialProjects={[]} />
        </div>
      </AppShell>
    );
  }

  // Admins see all projects; non-admins only their explicitly granted projects.
  // Empty projectAccess array → no projects (not all projects!)
  const where =
    authUser.role !== "admin"
      ? { id: { in: authUser.projectAccess } }
      : {};

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true, members: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        take: 5,
      },
      tasks: {
        select: { status: true, priority: true, dueDate: true, updatedAt: true, createdAt: true },
      },
      sprints: {
        select: { status: true },
      },
      logs: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      favorites: {
        where: { userId: authUser.id },
        select: { id: true },
      },
    },
    orderBy: [
      { archived: "asc" },   // aktive zuerst
      { updatedAt: "desc" },
    ],
  });

  // Health Scores berechnen + isFavorite flatten
  const projectsWithHealth = projects.map((p) => {
    const hasActiveSprint = p.sprints.some((s) => s.status === "active");
    const lastActivity = p.logs[0]?.createdAt ?? null;
    const healthScore = calculateHealthScore({
      tasks: p.tasks,
      hasActiveSprint,
      lastActivityAt: lastActivity,
    });
    return { ...p, healthScore, isFavorite: p.favorites.length > 0, favorites: undefined };
  });

  return (
    <AppShell title="Projekte" subtitle="Alle Projekte">
      <div className="p-6">
        <ProjectsClient initialProjects={projectsWithHealth as any} />
      </div>
    </AppShell>
  );
}
