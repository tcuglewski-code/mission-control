import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// Standardkonfigurationen für alle unterstützten Integrationstypen
const DEFAULT_INTEGRATIONS = [
  { type: "github",  name: "GitHub",       status: "inactive", enabled: false },
  { type: "slack",   name: "Slack",        status: "inactive", enabled: false },
  { type: "discord", name: "Discord",      status: "inactive", enabled: false },
  { type: "smtp",    name: "E-Mail (SMTP)", status: "inactive", enabled: false },
  { type: "webhook", name: "Webhook",      status: "inactive", enabled: false },
];

// GET /api/integrations — Alle Integrationen (konfiguriert + nicht konfiguriert)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const configured = await prisma.integrationConfig.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Nicht konfigurierte Typen als Platzhalter hinzufügen
    const configuredTypes = new Set(configured.map((c) => c.type));
    const missing = DEFAULT_INTEGRATIONS.filter((d) => !configuredTypes.has(d.type));

    const all = [
      ...configured.map((c) => ({
        ...c,
        config: (() => { try { return JSON.parse(c.config); } catch { return {}; } })(),
      })),
      ...missing.map((d) => ({ ...d, id: null, config: {}, createdAt: null, updatedAt: null, lastTestedAt: null, lastError: null })),
    ];

    return NextResponse.json(all);
  } catch (err) {
    console.error("[GET /api/integrations]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST /api/integrations — Integration erstellen oder aktualisieren
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { type, name, config, enabled } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type und name sind Pflichtfelder" }, { status: 400 });
    }

    const integration = await prisma.integrationConfig.upsert({
      where: { type },
      update: {
        name,
        config: JSON.stringify(config ?? {}),
        enabled: enabled ?? false,
        status: enabled ? "active" : "inactive",
        updatedAt: new Date(),
      },
      create: {
        type,
        name,
        config: JSON.stringify(config ?? {}),
        enabled: enabled ?? false,
        status: enabled ? "active" : "inactive",
      },
    });

    return NextResponse.json({
      ...integration,
      config: (() => { try { return JSON.parse(integration.config); } catch { return {}; } })(),
    });
  } catch (err) {
    console.error("[POST /api/integrations]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
