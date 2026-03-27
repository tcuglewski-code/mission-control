import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function signPayload(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Webhook-Lieferung mit Retry-Logik (3 Versuche bei Fehler)
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string | null },
  event: string,
  payloadObj: object
): Promise<void> {
  const payloadStr = JSON.stringify(payloadObj);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
    "User-Agent": "MissionControl-Webhook/1.0",
  };

  if (webhook.secret) {
    headers["X-Webhook-Signature"] = signPayload(payloadStr, webhook.secret);
  }

  const MAX_VERSUCHE = 3;
  const RETRY_DELAYS = [0, 2000, 5000]; // ms Wartezeit vor Versuch 1, 2, 3

  const start = Date.now();
  let status = 0;
  let responseBody: string | null = null;

  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    // Wartezeit vor dem Retry (Versuch 0 = sofort)
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

      // Bei Erfolg (2xx) Loop beenden
      if (status >= 200 && status < 300) break;
    } catch (err) {
      status = 0;
      responseBody = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
      // Bei Netzwerkfehler weiter versuchen (letzter Versuch = aufgeben)
    }
  }

  const duration = Date.now() - start;

  // Log & update in parallel, best-effort
  await Promise.allSettled([
    prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payloadStr,
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

// Outgoing Webhook auslösen mit standardisiertem Payload
// Payload-Format: { event, task, project, timestamp, triggeredBy }
export function triggerWebhooks(
  event: string,
  payload: object,
  projectId?: string
): void {
  // Fire-and-forget: don't await, don't block the response
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

      if (webhooks.length === 0) return;

      await Promise.allSettled(
        webhooks.map((wh) => deliverWebhook(wh, event, payload))
      );
    } catch (err) {
      console.error("[triggerWebhooks] Error:", err);
    }
  }, 0);
}
