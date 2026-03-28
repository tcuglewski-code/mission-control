import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/webhook-logs — Alle Webhook-Logs (eingehend + ausgehend)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("webhookId");
    const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

    const logs = await prisma.webhookLog.findMany({
      where: webhookId ? { webhookId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        // Join mit Webhook für Name
      },
    });

    // Webhook-Namen hinzufügen
    const webhookIds = [...new Set(logs.map((l) => l.webhookId))];
    const webhooks = webhookIds.length
      ? await prisma.webhook.findMany({
          where: { id: { in: webhookIds } },
          select: { id: true, name: true, url: true },
        })
      : [];

    const webhookMap = Object.fromEntries(webhooks.map((w) => [w.id, w]));

    const enriched = logs.map((log) => ({
      ...log,
      webhook: webhookMap[log.webhookId] ?? null,
      payloadPreview: (() => {
        try {
          const parsed = JSON.parse(log.payload);
          const preview = JSON.stringify(parsed).slice(0, 120);
          return preview.length === 120 ? preview + "…" : preview;
        } catch {
          return log.payload.slice(0, 120);
        }
      })(),
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[GET /api/webhook-logs]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
