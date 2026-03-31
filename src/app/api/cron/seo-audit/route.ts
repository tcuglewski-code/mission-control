/**
 * Rank-Agent: Automatisches SEO-Audit (AF077)
 * 
 * Läuft monatlich (1. des Monats) via Vercel Cron.
 * Analysiert Keyword-Rankings via Perplexity API.
 * Optional: Google Search Console Integration (wenn konfiguriert).
 * Erstellt MC-Task mit SEO-Report + Telegram-Benachrichtigung.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

// Zu überwachende Websites
const TARGET_SITES = [
  {
    name: "Koch Aufforstung",
    domain: "peru-otter-113714.hostingersite.com",
    keywords: [
      "Aufforstung Bayern",
      "Waldpflanzung Dienstleister",
      "Forstdienstleister München",
      "Baumschule Pflanzung",
      "Forstpflege Bayern",
      "Klimawald pflanzen",
      "Erstaufforstung Förderung",
      "Kulturpflege Wald",
    ],
  },
];

// SEO-Aspekte die geprüft werden sollen
const SEO_CHECKS = [
  "Title Tags (unter 60 Zeichen)",
  "Meta Description (unter 160 Zeichen)",
  "H1 Struktur (ein H1 pro Seite)",
  "Canonical URLs",
  "Internal Linking",
  "Mobile Friendliness",
  "Page Speed",
  "Schema.org Markup",
  "Image Alt Tags",
  "robots.txt und Sitemap.xml",
];

// Telegram Alert senden
async function sendTelegramReport(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[SEO-Audit] Telegram nicht konfiguriert");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[SEO-Audit] Telegram-Fehler:", err);
    return false;
  }
}

// Perplexity API für Keyword-Analyse aufrufen
async function analyzeKeywordsWithPerplexity(
  site: { name: string; domain: string; keywords: string[] }
): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.error("[SEO-Audit] PERPLEXITY_API_KEY nicht konfiguriert");
    return null;
  }

  try {
    const keywordList = site.keywords.map((k, i) => `${i + 1}. "${k}"`).join("\n");
    
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `Du bist ein SEO-Experte. Analysiere die Suchmaschinenposition und Sichtbarkeit für die angegebene Website und Keywords. 
            
Gib für jedes Keyword eine Einschätzung:
- Geschätzte Position (Top 3, Top 10, Top 20, Top 50, nicht rankend)
- Suchvolumen-Einschätzung (hoch/mittel/niedrig)
- Verbesserungspotenzial

Außerdem analysiere die allgemeine SEO-Qualität der Website (falls öffentlich erreichbar).

Antwort auf Deutsch, strukturiert mit Markdown.`,
          },
          {
            role: "user",
            content: `Analysiere die SEO-Performance für:

**Website:** ${site.name}
**Domain:** ${site.domain}

**Zu prüfende Keywords:**
${keywordList}

Zusätzlich prüfe diese SEO-Aspekte:
${SEO_CHECKS.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Gib einen umfassenden SEO-Audit-Report zurück.`,
          },
        ],
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[SEO-Audit] Perplexity API Fehler:", res.status, errorText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[SEO-Audit] Perplexity Fehler:", err);
    return null;
  }
}

// Google Search Console API (optional)
async function fetchGSCData(): Promise<{
  available: boolean;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
  topQueries?: Array<{ query: string; clicks: number; impressions: number; position: number }>;
} | null> {
  const gscCredentials = process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS;
  const gscSiteUrl = process.env.GSC_SITE_URL;

  if (!gscCredentials || !gscSiteUrl) {
    console.log("[SEO-Audit] Google Search Console nicht konfiguriert");
    return { available: false };
  }

  try {
    // GSC API Implementierung würde hier erfolgen
    // Für jetzt: Platzhalter, da GSC-Setup komplexer ist (OAuth2, Service Account)
    console.log("[SEO-Audit] GSC-Integration: Credentials vorhanden, API-Aufruf wird später implementiert");
    
    return {
      available: true,
      impressions: undefined,
      clicks: undefined,
      ctr: undefined,
      position: undefined,
      topQueries: undefined,
    };
  } catch (err) {
    console.error("[SEO-Audit] GSC Fehler:", err);
    return null;
  }
}

// MC Task erstellen
async function createSEOAuditTask(
  report: string,
  gscData: ReturnType<typeof fetchGSCData> extends Promise<infer T> ? T : never
): Promise<string | null> {
  try {
    // Passendes Projekt finden
    let project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: "Koch", mode: "insensitive" } },
          { name: { contains: "Website", mode: "insensitive" } },
          { name: { contains: "Marketing", mode: "insensitive" } },
          { name: { contains: "SEO", mode: "insensitive" } },
        ],
      },
    });

    // Fallback: erstes aktives Projekt
    if (!project) {
      project = await prisma.project.findFirst({
        where: { archived: false },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!project) {
      console.warn("[SEO-Audit] Kein Projekt gefunden für Task");
      return null;
    }

    const month = new Date().toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });

    // GSC-Abschnitt wenn verfügbar
    let gscSection = "";
    if (gscData?.available) {
      if (gscData.impressions !== undefined) {
        gscSection = `\n\n## 📊 Google Search Console Daten\n\n` +
          `- **Impressionen:** ${gscData.impressions?.toLocaleString("de-DE") ?? "N/A"}\n` +
          `- **Klicks:** ${gscData.clicks?.toLocaleString("de-DE") ?? "N/A"}\n` +
          `- **CTR:** ${gscData.ctr ? (gscData.ctr * 100).toFixed(2) + "%" : "N/A"}\n` +
          `- **Durchschn. Position:** ${gscData.position?.toFixed(1) ?? "N/A"}\n`;
        
        if (gscData.topQueries && gscData.topQueries.length > 0) {
          gscSection += `\n### Top Suchanfragen\n\n` +
            `| Query | Klicks | Impressionen | Position |\n` +
            `|-------|--------|--------------|----------|\n` +
            gscData.topQueries
              .slice(0, 10)
              .map((q) => `| ${q.query} | ${q.clicks} | ${q.impressions} | ${q.position.toFixed(1)} |`)
              .join("\n");
        }
      } else {
        gscSection = `\n\n## 📊 Google Search Console\n\n` +
          `✅ GSC-Credentials konfiguriert. API-Daten werden im nächsten Update abgerufen.\n` +
          `_Hinweis: Volle GSC-Integration erfordert OAuth2-Setup oder Service Account._`;
      }
    } else {
      gscSection = `\n\n## 📊 Google Search Console\n\n` +
        `⚠️ **Nicht konfiguriert**\n\n` +
        `Um GSC-Daten zu erhalten, folgende ENV-Variablen setzen:\n` +
        `- \`GOOGLE_SEARCH_CONSOLE_CREDENTIALS\` (Service Account JSON)\n` +
        `- \`GSC_SITE_URL\` (z.B. \`https://example.com\`)`;
    }

    const task = await prisma.task.create({
      data: {
        title: `🔍 SEO-Audit — ${month}`,
        description: `## Monatlicher SEO-Audit Report\n\n` +
          `**Generiert:** ${new Date().toLocaleString("de-DE")}\n\n` +
          `---\n\n${report}${gscSection}\n\n` +
          `---\n\n### Nächste Schritte\n\n` +
          `1. Priorisiere Findings nach Impact/Effort\n` +
          `2. Erstelle Tasks für kritische Issues\n` +
          `3. Tracke Keyword-Positionen im nächsten Monat\n\n` +
          `_Dieser Report wurde automatisch vom Rank-Agent (AF077) generiert._`,
        status: "backlog",
        priority: "medium",
        projectId: project.id,
        tags: ["seo", "audit", "rank-agent", "auto-generated"],
      },
    });

    console.log(`[SEO-Audit] Task erstellt: ${task.id}`);
    return task.id;
  } catch (err) {
    console.error("[SEO-Audit] Task-Erstellung fehlgeschlagen:", err);
    return null;
  }
}

// Monat für Report
function getMonthName(): string {
  return new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export async function GET(request: NextRequest) {
  // Auth prüfen
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{
    site: string;
    success: boolean;
    reportLength?: number;
    error?: string;
  }> = [];

  try {
    // GSC-Daten abrufen (parallel)
    const gscDataPromise = fetchGSCData();

    // Für jede Website SEO-Analyse durchführen
    let fullReport = "";
    
    for (const site of TARGET_SITES) {
      console.log(`[SEO-Audit] Analysiere: ${site.name} (${site.domain})`);
      
      const report = await analyzeKeywordsWithPerplexity(site);
      
      if (report) {
        fullReport += `# ${site.name}\n\n${report}\n\n---\n\n`;
        results.push({
          site: site.name,
          success: true,
          reportLength: report.length,
        });
      } else {
        results.push({
          site: site.name,
          success: false,
          error: "Perplexity API nicht verfügbar",
        });
      }
    }

    if (!fullReport) {
      return NextResponse.json({
        success: false,
        error: "Keine SEO-Analysen konnten durchgeführt werden",
        duration: Date.now() - startTime,
      }, { status: 503 });
    }

    // GSC-Daten holen
    const gscData = await gscDataPromise;

    // Task erstellen
    const taskId = await createSEOAuditTask(fullReport, gscData);

    // Telegram-Report (Zusammenfassung)
    const successCount = results.filter((r) => r.success).length;
    const telegramText = `🔍 <b>Monatlicher SEO-Audit</b>\n\n` +
      `<b>${getMonthName()}</b>\n\n` +
      `📊 <b>Analysierte Websites:</b> ${TARGET_SITES.length}\n` +
      `✅ <b>Erfolgreich:</b> ${successCount}\n` +
      `🔗 <b>GSC:</b> ${gscData?.available ? "Verbunden" : "Nicht konfiguriert"}\n\n` +
      `<b>Keywords analysiert:</b>\n` +
      TARGET_SITES.flatMap((s) => s.keywords.slice(0, 3))
        .map((k) => `• ${k}`)
        .join("\n") +
      (TARGET_SITES[0]?.keywords.length > 3 ? `\n<i>... und ${TARGET_SITES.reduce((sum, s) => sum + s.keywords.length, 0) - 3 * TARGET_SITES.length} weitere</i>` : "") +
      `\n\n${taskId ? `📋 Task: ${taskId}` : "⚠️ Task konnte nicht erstellt werden"}\n` +
      `<i>Vollständiger Report in Mission Control</i>`;

    const telegramSent = await sendTelegramReport(telegramText);

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: "SEO_AUDIT_COMPLETED",
        entityType: "task",
        entityId: taskId ?? "none",
        details: {
          sites: TARGET_SITES.map((s) => s.name),
          results,
          gscAvailable: gscData?.available ?? false,
          telegramSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      month: getMonthName(),
      taskId,
      telegramSent,
      gscAvailable: gscData?.available ?? false,
      results,
      duration: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error("[SEO-Audit Cron] Fehler:", err);
    return NextResponse.json({
      success: false,
      error: err.message ?? "Unbekannter Fehler",
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

// POST für manuelle Trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
