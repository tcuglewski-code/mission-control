import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { TimeTrackingClient } from "./TimeTrackingClient";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const authUser = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (!authUser) redirect("/login");

  const projectWhere = authUser.role !== "admin"
    ? { id: { in: authUser.projectAccess } }
    : {};

  const [entries, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    }),
    prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell title="Zeiterfassung" subtitle="Arbeitszeit-Tracking">
      <TimeTrackingClient initialEntries={entries} projects={projects} />
    </AppShell>
  );
}
