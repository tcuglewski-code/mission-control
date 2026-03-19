import { prisma } from "@/lib/prisma";
import { WebhooksClient } from "./WebhooksClient";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
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
