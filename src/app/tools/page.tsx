import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ToolsClient } from "./ToolsClient";

export default async function ToolsPage() {
  const tools = await prisma.tool.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Tools" subtitle="Integrated Tools & Services">
      <div className="p-6">
        <ToolsClient initialTools={tools} />
      </div>
    </AppShell>
  );
}
