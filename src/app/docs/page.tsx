import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { DocsClient } from "./DocsClient";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";

export default async function DocsPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const [docs, projects] = await Promise.all([
    prisma.document.findMany({
      where: allowedIds
        ? { OR: [{ projectId: null }, { projectId: { in: allowedIds } }] }
        : {},
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: allowedIds ? { id: { in: allowedIds } } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell title="Dokumente" subtitle="Dokumentation & Wissensbasis" noScroll>
      <div className="h-full">
        <DocsClient initialDocs={docs} projects={projects} />
      </div>
    </AppShell>
  );
}
