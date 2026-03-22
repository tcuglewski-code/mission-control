import { prisma } from "@/lib/prisma";
import { WebhooksClient } from "./WebhooksClient";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const session = await requireServerSession();

  if (session.role !== "admin") {
    return (
      <AppShell title="Webhooks" subtitle="Automatisierte Benachrichtigungen">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Dieses Modul ist nur für Administratoren zugänglich.</p>
        </div>
      </AppShell>
    );
  }

  const [webhooksRaw, projects] = await Promise.all([
    prisma.webhook.findMany({
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { status: "active" },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize Date objects to strings for the client component
  const webhooks = webhooksRaw.map((wh) => ({
    ...wh,
    lastTriggered: wh.lastTriggered?.toISOString() ?? null,
    createdAt: wh.createdAt.toISOString(),
    updatedAt: wh.updatedAt.toISOString(),
  }));

  return <WebhooksClient initialWebhooks={webhooks} projects={projects} />;
}
