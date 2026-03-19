import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { DiagramClient } from "./DiagramClient";

export const dynamic = "force-dynamic";

export default async function DiagramPage() {
  const [projects, databases] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true, color: true, status: true, description: true },
      orderBy: { name: "asc" },
    }),
    prisma.database.findMany({
      select: { id: true, name: true, type: true, status: true, projectId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell title="Projektdiagramm" subtitle="Infrastruktur-Übersicht" noScroll>
      <DiagramClient projects={projects} databases={databases} />
    </AppShell>
  );
}
