import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { TimeTrackingClient } from "./TimeTrackingClient";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const authUser = await prisma.authUser.findUnique({ where: { id: session.user.id } });
    if (!authUser) redirect("/login");

    const projectWhere = authUser.role !== "admin"
      ? { id: { in: authUser.projectAccess } }
      : {};

    const [entries, projects, users] = await Promise.all([
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
        take: 500,
      }),
      prisma.project.findMany({
        where: projectWhere,
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      }),
      // Nur Admins sehen den User-Filter
      authUser.role === "admin"
        ? prisma.user.findMany({
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    return (
      <AppShell title="Zeiterfassung" subtitle="Auswertung & Export">
        <TimeTrackingClient
          initialEntries={entries as any}
          projects={projects}
          users={users}
        />
      </AppShell>
    );
  } catch (error) {
    console.error("[TimePage] Failed to load data:", error);
    // Return empty state on error
    return (
      <AppShell title="Zeiterfassung" subtitle="Auswertung & Export">
        <TimeTrackingClient
          initialEntries={[]}
          projects={[]}
          users={[]}
        />
      </AppShell>
    );
  }
}
