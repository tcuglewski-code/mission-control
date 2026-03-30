import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * GET /api/integrations
 * Liste aller konfigurierten Integrationen
 */
export async function GET(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integrations = await prisma.integrationConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Webhook URLs maskieren (Sicherheit)
    const masked = integrations.map((i) => ({
      ...i,
      webhookUrl: i.webhookUrl ? maskUrl(i.webhookUrl) : null,
      botToken: i.botToken ? "••••••••" : null,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error("[GET /api/integrations] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Neue Integration erstellen oder aktualisieren (upsert by type)
 */
export async function POST(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nur Admins dürfen Integrationen konfigurieren
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type, name, webhookUrl, botToken, channelId, events, enabled, metadata } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "type and name are required" },
        { status: 400 }
      );
    }

    // Validiere type
    const validTypes = ["slack", "discord", "telegram", "email"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert: erstellt oder aktualisiert basierend auf type
    const integration = await prisma.integrationConfig.upsert({
      where: { type },
      create: {
        type,
        name,
        webhookUrl,
        botToken,
        channelId,
        events: events ? JSON.stringify(events) : null,
        enabled: enabled ?? false,
        status: "inactive",
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      update: {
        name,
        webhookUrl,
        botToken,
        channelId,
        events: events ? JSON.stringify(events) : undefined,
        enabled,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...integration,
      webhookUrl: integration.webhookUrl ? maskUrl(integration.webhookUrl) : null,
      botToken: integration.botToken ? "••••••••" : null,
    });
  } catch (error) {
    console.error("[POST /api/integrations] Error:", error);
    return NextResponse.json(
      { error: "Failed to save integration" },
      { status: 500 }
    );
  }
}

/**
 * Maskiert eine URL für sichere Anzeige
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    // Zeige nur letzte 8 Zeichen des Paths
    if (path.length > 12) {
      return `${parsed.origin}/...${path.slice(-8)}`;
    }
    return url;
  } catch {
    return "••••••••";
  }
}
