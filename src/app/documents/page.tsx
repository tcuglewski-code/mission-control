import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentsClient } from "./DocumentsClient";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";

export const metadata = {
  title: "Dateiverwaltung — Mission Control",
};

export default async function DocumentsPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const andClauses: object[] = [];
  if (allowedIds !== null) {
    andClauses.push({
      OR: [{ projectId: null }, { projectId: { in: allowedIds } }],
    });
  }

  const [docs, projects] = await Promise.all([
    prisma.fileDoc.findMany({
      where: andClauses.length > 0 ? { AND: andClauses } : {},
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: allowedIds ? { id: { in: allowedIds } } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const username = session.username ?? "System";

  // Serialize Dates to strings for client component
  const serializedDocs = docs.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <AppShell
      title="Dateiverwaltung"
      subtitle="Dokumente & Links verwalten"
      noScroll
    >
      <div className="h-full">
        <DocumentsClient
          initialDocs={serializedDocs}
          projects={projects}
          uploaderName={username}
        />
      </div>
    </AppShell>
  );
}
