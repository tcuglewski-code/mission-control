import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { isValidSlackWebhook } from "@/lib/slack";

/**
 * GET /api/integrations/slack
 * Holt die aktuelle Slack-Konfiguration
 */
export async function GET(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.integrationConfig.findUnique({
      where: { type: "slack" },
    });

    if (!config) {
      return NextResponse.json({
        configured: false,
        type: "slack",
        name: "Slack",
        enabled: false,
        status: "inactive",
        events: [],
      });
    }

    return NextResponse.json({
      configured: true,
      id: config.id,
      type: config.type,
      name: config.name,
      webhookUrl: config.webhookUrl ? maskUrl(config.webhookUrl) : null,
      webhookUrlSet: !!config.webhookUrl,
      channelId: config.channelId,
      events: config.events ? JSON.parse(config.events) : [],
      enabled: config.enabled,
      status: config.status,
      lastTestedAt: config.lastTestedAt,
      lastError: config.lastError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("[GET /api/integrations/slack] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Slack config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/slack
 * Aktualisiert die Slack-Konfiguration
 */
export async function PUT(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nur Admins dürfen konfigurieren
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { webhookUrl, channelId, events, enabled } = body;

    // Validiere Webhook-URL falls angegeben
    if (webhookUrl && !isValidSlackWebhook(webhookUrl)) {
      return NextResponse.json(
        { error: "Invalid Slack webhook URL. Must be https://hooks.slack.com/..." },
        { status: 400 }
      );
    }

    // Upsert
    const config = await prisma.integrationConfig.upsert({
      where: { type: "slack" },
      create: {
        type: "slack",
        name: "Slack Notifications",
        webhookUrl,
        channelId,
        events: events ? JSON.stringify(events) : JSON.stringify(["task.completed", "ticket.created"]),
        enabled: enabled ?? false,
        status: webhookUrl ? "inactive" : "inactive",
      },
      update: {
        webhookUrl,
        channelId,
        events: events ? JSON.stringify(events) : undefined,
        enabled,
        // Reset Status bei URL-Änderung
        ...(webhookUrl !== undefined && {
          status: "inactive",
          lastError: null,
        }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: config.id,
      type: config.type,
      webhookUrlSet: !!config.webhookUrl,
      enabled: config.enabled,
      status: config.status,
      events: config.events ? JSON.parse(config.events) : [],
    });
  } catch (error) {
    console.error("[PUT /api/integrations/slack] Error:", error);
    return NextResponse.json(
      { error: "Failed to update Slack config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/slack
 * Löscht die Slack-Konfiguration
 */
export async function DELETE(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    await prisma.integrationConfig.delete({
      where: { type: "slack" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Ignore if not found
    return NextResponse.json({ success: true });
  }
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.length > 12) {
      return `${parsed.origin}/...${path.slice(-8)}`;
    }
    return url;
  } catch {
    return "••••••••";
  }
}
