import { prisma } from "@/lib/prisma";
import { DatabasesClient } from "./DatabasesClient";

export const dynamic = "force-dynamic";

export default async function DatabasesPage() {
  const [databases, projects] = await Promise.all([
    prisma.database.findMany({
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
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
