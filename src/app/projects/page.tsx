import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsClient } from "./ProjectsClient";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

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
    },
    orderBy: [
      { archived: "asc" },   // aktive zuerst
      { updatedAt: "desc" },
    ],
  });

  return (
    <AppShell title="Projekte" subtitle="Alle Projekte">
      <div className="p-6">
        <ProjectsClient initialProjects={projects} />
      </div>
    </AppShell>
  );
}
