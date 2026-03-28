import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import crypto from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/webhook-logs/[id]/retry — Webhook erneut senden
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const log = await prisma.webhookLog.findUnique({ where: { id } });
    if (!log) return NextResponse.json({ error: "Log nicht gefunden" }, { status: 404 });

    const webhook = await prisma.webhook.findUnique({ where: { id: log.webhookId } });
    if (!webhook) return NextResponse.json({ error: "Webhook nicht gefunden" }, { status: 404 });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": log.event,
      "X-Webhook-Retry": "true",
      "User-Agent": "MissionControl-Webhook/1.0",
    };

    if (webhook.secret) {
      headers["X-Webhook-Signature"] =
        "sha256=" + crypto.createHmac("sha256", webhook.secret).update(log.payload).digest("hex");
    }

    const start = Date.now();
    let status = 0;
    let responseBody: string | null = null;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: log.payload,
        signal: AbortSignal.timeout(15_000),
      });
      status = res.status;
      responseBody = (await res.text().catch(() => "")).slice(0, 500) || null;
    } catch (err) {
      status = 0;
      responseBody = err instanceof Error ? err.message.slice(0, 500) : "Verbindungsfehler";
    }

    const duration = Date.now() - start;

    // Neuen Log-Eintrag erstellen (Retry-Dokumentation)
    const newLog = await prisma.webhookLog.create({
      data: {
        webhookId: log.webhookId,
        event: log.event,
        payload: log.payload,
        status,
        response: responseBody,
        duration,
      },
    });

    // Webhook lastStatus aktualisieren
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastTriggered: new Date(), lastStatus: status },
    });

    return NextResponse.json({ success: status >= 200 && status < 300, status, duration, logId: newLog.id });
  } catch (err) {
    console.error("[POST /api/webhook-logs/[id]/retry]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
