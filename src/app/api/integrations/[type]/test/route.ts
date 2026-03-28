import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ type: string }> };

// POST /api/integrations/[type]/test — Verbindung testen
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await params;
    const integration = await prisma.integrationConfig.findUnique({ where: { type } });

    if (!integration) {
      return NextResponse.json({ error: "Integration nicht konfiguriert" }, { status: 404 });
    }

    let config: Record<string, string> = {};
    try { config = JSON.parse(integration.config); } catch { /* ignore */ }

    const start = Date.now();
    let testStatus = 0;
    let testMessage = "";
    let success = false;

    if (type === "slack" || type === "discord") {
      const webhookUrl = config.webhookUrl;
      if (!webhookUrl) {
        return NextResponse.json({ success: false, message: "Webhook-URL nicht konfiguriert" }, { status: 400 });
      }

      const testPayload = type === "slack"
        ? {
            text: "✅ *Mission Control Test* — Verbindung erfolgreich!",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "✅ *Mission Control Test*\nDiese Testnachricht wurde von Mission Control gesendet.\n_Koch Aufforstung GmbH_",
                },
              },
            ],
          }
        : {
            content: "✅ **Mission Control Test** — Verbindung erfolgreich!\nDiese Testnachricht wurde von Mission Control gesendet.",
            username: "Mission Control",
            embeds: [
              {
                title: "Verbindungstest erfolgreich",
                description: "Mission Control kann erfolgreich Nachrichten an diesen Discord-Webhook senden.",
                color: 0x10b981,
                footer: { text: "Koch Aufforstung GmbH — Mission Control" },
              },
            ],
          };

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10_000),
        });
        testStatus = res.status;
        success = res.status >= 200 && res.status < 300;
        testMessage = success
          ? `Testnachricht erfolgreich gesendet (${res.status})`
          : `Fehler: HTTP ${res.status}`;
      } catch (err) {
        testMessage = err instanceof Error ? err.message : "Verbindungsfehler";
      }
    } else if (type === "github") {
      // Teste GitHub API-Verbindung mit dem konfigurierten Token
      const token = config.token;
      const repo = config.repo;
      if (!token) {
        return NextResponse.json({ success: false, message: "GitHub Token nicht konfiguriert" }, { status: 400 });
      }
      try {
        const url = repo
          ? `https://api.github.com/repos/${repo}`
          : "https://api.github.com/user";
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(10_000),
        });
        testStatus = res.status;
        success = res.status === 200;
        const data = await res.json().catch(() => ({}));
        testMessage = success
          ? `Verbindung erfolgreich${repo ? ` — Repo: ${data.full_name ?? repo}` : ` — Benutzer: ${data.login ?? "unknown"}`}`
          : `Fehler: ${data.message ?? `HTTP ${res.status}`}`;
      } catch (err) {
        testMessage = err instanceof Error ? err.message : "Verbindungsfehler";
      }
    } else if (type === "webhook") {
      const webhookUrl = config.webhookUrl;
      if (!webhookUrl) {
        return NextResponse.json({ success: false, message: "Webhook-URL nicht konfiguriert" }, { status: 400 });
      }
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "test", message: "Mission Control Verbindungstest", timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(10_000),
        });
        testStatus = res.status;
        success = res.status >= 200 && res.status < 300;
        testMessage = success ? `Test erfolgreich (HTTP ${res.status})` : `Fehler: HTTP ${res.status}`;
      } catch (err) {
        testMessage = err instanceof Error ? err.message : "Verbindungsfehler";
      }
    } else {
      return NextResponse.json({ success: false, message: "Test für diesen Integrationstyp nicht verfügbar" });
    }

    const duration = Date.now() - start;

    // Status aktualisieren
    await prisma.integrationConfig.update({
      where: { type },
      data: {
        lastTestedAt: new Date(),
        status: success ? "active" : "error",
        lastError: success ? null : testMessage,
      },
    });

    return NextResponse.json({ success, status: testStatus, message: testMessage, duration });
  } catch (err) {
    console.error("[POST /api/integrations/[type]/test]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
