import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { ToolsClient } from "./ToolsClient";
import { requireServerSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function ToolsPage() {
  const session = await requireServerSession();

  // Tools sind nur für Admins zugänglich
  if (session.role !== "admin") {
    redirect("/dashboard");
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
