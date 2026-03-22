import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ToolsClient } from "./ToolsClient";
import { requireServerSession } from "@/lib/server-auth";

export default async function ToolsPage() {
  const session = await requireServerSession();

  if (session.role !== "admin") {
    return (
      <AppShell title="Tools" subtitle="Integrierte Tools & Dienste">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Dieses Modul ist nur für Administratoren zugänglich.</p>
        </div>
      </AppShell>
    );
  }

  const tools = await prisma.tool.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Tools" subtitle="Integrierte Tools & Dienste">
      <div className="p-6">
        <ToolsClient initialTools={tools} />
      </div>
    </AppShell>
  );
}
