import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { DocsClient } from "./DocsClient";

export default async function DocsPage() {
  const [docs, projects] = await Promise.all([
    prisma.document.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
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
