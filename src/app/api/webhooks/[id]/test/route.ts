import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const webhook = await prisma.webhook.findUnique({ where: { id } });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const testPayload = JSON.stringify({
      event: "webhook.test",
      webhookId: webhook.id,
      webhookName: webhook.name,
      timestamp: new Date().toISOString(),
      data: { message: "This is a test ping from Mission Control 🚀" },
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": "webhook.test",
      "User-Agent": "MissionControl-Webhook/1.0",
    };

    if (webhook.secret) {
      headers["X-Webhook-Signature"] =
        "sha256=" +
        crypto.createHmac("sha256", webhook.secret).update(testPayload).digest("hex");
    }

    const start = Date.now();
    let status = 0;
    let responseBody: string | null = null;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: testPayload,
        signal: AbortSignal.timeout(15_000),
      });
      status = res.status;
      const text = await res.text().catch(() => "");
      responseBody = text.slice(0, 500) || null;
    } catch (err) {
      status = 0;
      responseBody = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    }

    const duration = Date.now() - start;

    await Promise.allSettled([
      prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: "webhook.test",
          payload: testPayload,
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

    return NextResponse.json({ status, response: responseBody, duration });
  } catch (error) {
    console.error("[POST /api/webhooks/[id]/test]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
