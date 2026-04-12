import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function signPayload(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// ─── Slack-Payload formatieren ────────────────────────────────────────────────
function formatSlackPayload(event: string, payloadObj: object): object {
  const p = payloadObj as Record<string, unknown>;

  const eventEmojis: Record<string, string> = {
    "task.completed": "✅",
    "task.created": "🆕",
    "task.updated": "✏️",
    "task.deleted": "🗑️",
    "comment.added": "💬",
    "milestone.completed": "🏆",
    "ticket.created": "🎫",
    "ticket.updated": "🔄",
  };

  const emoji = eventEmojis[event] ?? "🔔";

  let text = `${emoji} *Mission Control* — \`${event}\``;
  let detailText = "";

  if (event === "task.completed" && p.task) {
    const task = p.task as Record<string, unknown>;
    text = `${emoji} Task als erledigt markiert`;
    detailText = `*${task.title ?? "Unbekannter Task"}*${task.project ? `\nProjekt: ${(task.project as Record<string, unknown>).name ?? ""}` : ""}`;
  } else if (event === "comment.added" && p.task) {
    const task = p.task as Record<string, unknown>;
    const comment = p.comment as Record<string, unknown> | undefined;
    text = `${emoji} Neuer Kommentar`;
    detailText = `Task: *${task.title ?? ""}*\n${comment?.authorName ?? "Jemand"}: ${String(comment?.content ?? "").slice(0, 100)}`;
  } else if (event === "milestone.completed" && p.milestone) {
    const ms = p.milestone as Record<string, unknown>;
    text = `${emoji} Meilenstein erreicht!`;
    detailText = `*${ms.title ?? "Meilenstein"}*${ms.project ? `\nProjekt: ${(ms.project as Record<string, unknown>).name ?? ""}` : ""}`;
  }

  return {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: detailText ? `${text}\n${detailText}` : text,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Koch Aufforstung GmbH — Mission Control | ${new Date().toLocaleString("de-DE")}`,
          },
        ],
      },
    ],
  };
}

// ─── Discord-Payload formatieren ──────────────────────────────────────────────
function formatDiscordPayload(event: string, payloadObj: object): object {
  const p = payloadObj as Record<string, unknown>;

  const eventColors: Record<string, number> = {
    "task.completed": 0x10b981,
    "task.created": 0x3b82f6,
    "task.updated": 0xf59e0b,
    "task.deleted": 0xef4444,
    "comment.added": 0x8b5cf6,
    "milestone.completed": 0xf59e0b,
    "ticket.created": 0x06b6d4,
    "ticket.updated": 0x6366f1,
  };

  const color = eventColors[event] ?? 0x6b7280;

  let title = `Mission Control — ${event}`;
  let description = "";

  if (event === "task.completed" && p.task) {
    const task = p.task as Record<string, unknown>;
    title = "✅ Task erledigt";
    description = `**${task.title ?? "Unbekannter Task"}**${task.project ? `\nProjekt: ${(task.project as Record<string, unknown>).name ?? ""}` : ""}`;
  } else if (event === "comment.added" && p.task) {
    const task = p.task as Record<string, unknown>;
    const comment = p.comment as Record<string, unknown> | undefined;
    title = "💬 Neuer Kommentar";
    description = `Task: **${task.title ?? ""}**\n${comment?.authorName ?? "Jemand"}: ${String(comment?.content ?? "").slice(0, 200)}`;
  } else if (event === "milestone.completed" && p.milestone) {
    const ms = p.milestone as Record<string, unknown>;
    title = "🏆 Meilenstein erreicht!";
    description = `**${ms.title ?? "Meilenstein"}**${ms.project ? `\nProjekt: ${(ms.project as Record<string, unknown>).name ?? ""}` : ""}`;
  }

  return {
    username: "Mission Control",
    embeds: [
      {
        title,
        description,
        color,
        footer: {
          text: `Koch Aufforstung GmbH — Mission Control`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// ─── Erkennt Slack/Discord URLs ───────────────────────────────────────────────
function detectWebhookType(url: string): "slack" | "discord" | "generic" {
  if (url.includes("hooks.slack.com")) return "slack";
  if (url.includes("discord.com/api/webhooks") || url.includes("discordapp.com/api/webhooks")) return "discord";
  return "generic";
}

// ─── Webhook-Lieferung mit Retry-Logik ────────────────────────────────────────
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string | null },
  event: string,
  payloadObj: object
): Promise<void> {
  const webhookType = detectWebhookType(webhook.url);

  let finalPayload: object;
  if (webhookType === "slack") {
    finalPayload = formatSlackPayload(event, payloadObj);
  } else if (webhookType === "discord") {
    finalPayload = formatDiscordPayload(event, payloadObj);
  } else {
    finalPayload = payloadObj;
  }

  const payloadStr = JSON.stringify(finalPayload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
    "User-Agent": "MissionControl-Webhook/1.0",
  };

  if (webhook.secret && webhookType === "generic") {
    headers["X-Webhook-Signature"] = signPayload(payloadStr, webhook.secret);
  }

  const MAX_VERSUCHE = 3;
  const RETRY_DELAYS = [0, 2000, 5000];

  const start = Date.now();
  let status = 0;
  let responseBody: string | null = null;

  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    if (versuch > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[versuch]));
    }

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payloadStr,
        signal: AbortSignal.timeout(15_000),
      });
      status = res.status;
      const text = await res.text().catch(() => "");
      responseBody = text.slice(0, 500) || null;
      if (status >= 200 && status < 300) break;
    } catch (err) {
      status = 0;
      responseBody = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    }
  }

  const duration = Date.now() - start;

  await Promise.allSettled([
    prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: JSON.stringify(payloadObj), // Original-Payload loggen
        status,
        response: responseBody,
        duration,
      },
    }),
    prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastTriggered: new Date(), lastStatus: status },
    }),
  ]);
}

// ─── Ausgehende Integrationswebhooks (Slack/Discord via IntegrationConfig) ────
async function deliverIntegrationWebhook(
  url: string,
  event: string,
  payloadObj: object
): Promise<{ status: number; success: boolean }> {
  const webhookType = detectWebhookType(url);

  let finalPayload: object;
  if (webhookType === "slack") {
    finalPayload = formatSlackPayload(event, payloadObj);
  } else if (webhookType === "discord") {
    finalPayload = formatDiscordPayload(event, payloadObj);
  } else {
    finalPayload = payloadObj;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "MissionControl-Webhook/1.0" },
      body: JSON.stringify(finalPayload),
      signal: AbortSignal.timeout(15_000),
    });
    return { status: res.status, success: res.status >= 200 && res.status < 300 };
  } catch {
    return { status: 0, success: false };
  }
}

// ─── Outgoing Webhook auslösen (bestehende Webhook-Tabelle) ───────────────────
export function triggerWebhooks(
  event: string,
  payload: object,
  projectId?: string
): void {
  setTimeout(async () => {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          active: true,
          events: { has: event },
          ...(projectId
            ? { OR: [{ projectId }, { projectId: null }] }
            : { projectId: null }),
        },
        select: { id: true, url: true, secret: true },
      });

      if (webhooks.length > 0) {
        await Promise.allSettled(
          webhooks.map((wh) => deliverWebhook(wh, event, payload))
        );
      }

      // Zusätzlich: IntegrationConfig-Webhooks (Slack/Discord) prüfen
      await triggerIntegrationWebhooks(event, payload);
    } catch (err) {
      console.error("[triggerWebhooks] Error:", err);
    }
  }, 0);
}

// ─── Integration-Webhooks (Slack/Discord aus IntegrationConfig) ───────────────
async function triggerIntegrationWebhooks(event: string, payload: object): Promise<void> {
  try {
    const integrations = await prisma.integrationConfig.findMany({
      where: {
        enabled: true,
        type: { in: ["slack", "discord"] },
      },
    });

    for (const integration of integrations) {
      try {
        const config: Record<string, unknown> = JSON.parse(integration.config);
        const events = (config.events as string[]) ?? [];
        const webhookUrl = config.webhookUrl as string | undefined;

        if (!webhookUrl || !events.includes(event)) continue;

        await deliverIntegrationWebhook(webhookUrl, event, payload);
      } catch (err) {
        console.error(`[triggerIntegrationWebhooks] Fehler für ${integration.type}:`, err);
      }
    }
  } catch (err) {
    console.error("[triggerIntegrationWebhooks]", err);
  }
}
