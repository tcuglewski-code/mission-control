import { prisma } from "@/lib/prisma";
import { DatabasesClient } from "./DatabasesClient";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function DatabasesPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const [databases, projects] = await Promise.all([
    prisma.database.findMany({
      where: allowedIds
        ? { OR: [{ projectId: null }, { projectId: { in: allowedIds } }] }
        : {},
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: allowedIds ? { id: { in: allowedIds } } : {},
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize BigInt
  const serialized = JSON.parse(
    JSON.stringify(databases, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <DatabasesClient initialDatabases={serialized} projects={projects} />
    </div>
  );
}
