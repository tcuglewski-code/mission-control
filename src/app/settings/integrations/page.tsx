import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { IntegrationsClient } from "./IntegrationsClient";

export default async function IntegrationsPage() {
  await requireServerSession();

  const projects = await prisma.project.findMany({
    where: { archived: false },
    select: { id: true, name: true, color: true, githubRepo: true },
    orderBy: { name: "asc" },
  });

  // Konfigurierte Integrationen laden
  const configured = await prisma.integrationConfig.findMany({
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  const configuredMap = Object.fromEntries(
    configured.map((c) => [
      c.type,
      {
        ...c,
        config: (() => { try { return JSON.parse(c.config); } catch { return {}; } })(),
      },
    ])
  );

  // Initiale Webhook-Logs (letzte 50)
  const webhookLogs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  }).catch(() => []);

  // Webhook-Namen für Logs
  const webhookIds = [...new Set(webhookLogs.map((l) => l.webhookId))];
  const webhooks = webhookIds.length
    ? await prisma.webhook.findMany({
        where: { id: { in: webhookIds } },
        select: { id: true, name: true, url: true },
      }).catch(() => [])
    : [];
  const webhookMap = Object.fromEntries(webhooks.map((w) => [w.id, w]));

  const logsWithWebhook = webhookLogs.map((log) => ({
    ...log,
    webhook: webhookMap[log.webhookId] ?? null,
    payloadPreview: (() => {
      try {
        const p = JSON.stringify(JSON.parse(log.payload)).slice(0, 120);
        return p.length === 120 ? p + "…" : p;
      } catch {
        return log.payload.slice(0, 120);
      }
    })(),
  }));

  return (
    <AppShell title="Integrationen" subtitle="Verbinde externe Dienste mit Mission Control">
      <IntegrationsClient
        projects={projects}
        configuredMap={configuredMap}
        initialLogs={logsWithWebhook}
      />
    </AppShell>
  );
}
