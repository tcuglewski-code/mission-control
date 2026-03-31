/**
 * Lexos-Agent: DSGVO Compliance Monitor (AF071)
 * 
 * Wöchentlicher Cron (Montag 10:00 UTC) prüft alle Tenant-Seiten auf:
 * - Impressum (/impressum, /imprint, /legal)
 * - Datenschutzerklärung (/datenschutz, /privacy, /privacy-policy)
 * - Cookie-Banner (Script-Tags für bekannte Cookie-Tools)
 * 
 * Bei fehlenden Elementen → Telegram-Alert + ActivityLog
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

// DSGVO-relevante Pfade die geprüft werden
const IMPRESSUM_PATHS = ["/impressum", "/imprint", "/legal", "/legal-notice"];
const PRIVACY_PATHS = ["/datenschutz", "/privacy", "/privacy-policy", "/datenschutzerklaerung"];

// Bekannte Cookie-Banner Scripts/Keywords
const COOKIE_BANNER_INDICATORS = [
  "cookieconsent",
  "cookie-consent",
  "cookiebot",
  "onetrust",
  "trustarc",
  "cookieinformation",
  "usercentrics",
  "didomi",
  "quantcast",
  "gdpr",
  "cookie-notice",
  "cookie-law",
  "cookie-banner",
  "complianz",
  "borlabs-cookie",
  "real-cookie-banner",
  "wp-gdpr",
  "cookie-script",
  "ccm19",
  // WP-spezifisch
  "cmplz",
];

// Telegram Alert senden
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[DSGVO] Telegram nicht konfiguriert");
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
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[DSGVO] Telegram-Fehler:", err);
    return false;
  }
}

// Seite abrufen und HTML zurückgeben
async function fetchPage(url: string): Promise<{ ok: boolean; html?: string; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "MissionControl-DSGVO-Monitor/1.0",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { ok: false, status: res.status };
    }

    const html = await res.text();
    return { ok: true, html, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// Prüft ob eine der Pfade erreichbar ist
async function checkPaths(baseUrl: string, paths: string[]): Promise<{ found: boolean; path?: string; status?: number }> {
  for (const path of paths) {
    const url = baseUrl.replace(/\/$/, "") + path;
    const result = await fetchPage(url);
    if (result.ok && result.status === 200) {
      return { found: true, path };
    }
  }
  return { found: false };
}

// Prüft ob Cookie-Banner im HTML vorhanden ist
function checkCookieBanner(html: string): { found: boolean; indicator?: string } {
  const lowerHtml = html.toLowerCase();
  
  for (const indicator of COOKIE_BANNER_INDICATORS) {
    if (lowerHtml.includes(indicator)) {
      return { found: true, indicator };
    }
  }
  
  // Zusätzliche Checks für Cookie-relevante Elemente
  const cookiePatterns = [
    /class="[^"]*cookie[^"]*"/i,
    /id="[^"]*cookie[^"]*"/i,
    /data-cookie/i,
    /"cookiePolicy"/i,
    /accept.*cookie/i,
  ];
  
  for (const pattern of cookiePatterns) {
    if (pattern.test(html)) {
      return { found: true, indicator: "Generic cookie element" };
    }
  }
  
  return { found: false };
}

// Compliance-Check für einen Tenant durchführen
async function checkTenantCompliance(tenantId: string, tenantName: string, url: string): Promise<{
  tenantId: string;
  tenantName: string;
  url: string;
  impressum: { found: boolean; path?: string };
  privacy: { found: boolean; path?: string };
  cookieBanner: { found: boolean; indicator?: string };
  issues: string[];
  compliant: boolean;
}> {
  const issues: string[] = [];

  // 1. Impressum prüfen
  const impressum = await checkPaths(url, IMPRESSUM_PATHS);
  if (!impressum.found) {
    issues.push("Kein Impressum gefunden");
  }

  // 2. Datenschutzerklärung prüfen
  const privacy = await checkPaths(url, PRIVACY_PATHS);
  if (!privacy.found) {
    issues.push("Keine Datenschutzerklärung gefunden");
  }

  // 3. Cookie-Banner prüfen (Hauptseite laden)
  const mainPage = await fetchPage(url);
  let cookieBanner = { found: false, indicator: undefined as string | undefined };
  
  if (mainPage.ok && mainPage.html) {
    cookieBanner = checkCookieBanner(mainPage.html);
    if (!cookieBanner.found) {
      issues.push("Kein Cookie-Banner erkannt");
    }
  } else {
    issues.push(`Hauptseite nicht erreichbar: ${mainPage.error || `Status ${mainPage.status}`}`);
  }

  return {
    tenantId,
    tenantName,
    url,
    impressum,
    privacy,
    cookieBanner,
    issues,
    compliant: issues.length === 0,
  };
}

export async function GET(request: Request) {
  // Auth prüfen
  const authResult = verifyCronAuth(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const results: Array<{
    tenantId: string;
    tenantName: string;
    url: string;
    compliant: boolean;
    issues: string[];
    details: {
      impressum: { found: boolean; path?: string };
      privacy: { found: boolean; path?: string };
      cookieBanner: { found: boolean; indicator?: string };
    };
  }> = [];

  let alertNeeded = false;
  const nonCompliantTenants: string[] = [];

  try {
    // Alle Monitoring-Configs laden (gleiche Tenant-Liste wie Uptime)
    let configs = await prisma.monitoringConfig.findMany({
      where: { enabled: true },
    });

    if (configs.length === 0) {
      // Default-Tenants wenn noch keine Config existiert
      const defaultTenants = [
        { tenantId: "mission-control", tenantName: "Mission Control", url: "https://mission-control-tawny-omega.vercel.app" },
        { tenantId: "ka-forstmanager", tenantName: "ForstManager", url: "https://ka-forstmanager.vercel.app" },
        { tenantId: "ka-website", tenantName: "Koch Aufforstung Website", url: "https://peru-otter-113714.hostingersite.com" },
      ];

      for (const tenant of defaultTenants) {
        await prisma.monitoringConfig.upsert({
          where: { tenantId: tenant.tenantId },
          update: {},
          create: {
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            url: tenant.url,
            enabled: true,
          },
        });
      }
      configs = await prisma.monitoringConfig.findMany({ where: { enabled: true } });
    }

    // Alle Tenants prüfen (sequentiell um Rate-Limiting zu vermeiden)
    for (const config of configs) {
      const result = await checkTenantCompliance(
        config.tenantId,
        config.tenantName,
        config.url
      );

      results.push({
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        url: result.url,
        compliant: result.compliant,
        issues: result.issues,
        details: {
          impressum: result.impressum,
          privacy: result.privacy,
          cookieBanner: result.cookieBanner,
        },
      });

      if (!result.compliant) {
        alertNeeded = true;
        nonCompliantTenants.push(result.tenantName);
      }
    }

    // ActivityLog schreiben
    await prisma.activityLog.create({
      data: {
        action: "DSGVO_COMPLIANCE_CHECK",
        entityType: "system",
        entityId: "lexos-agent",
        description: `DSGVO-Compliance-Check: ${configs.length} Tenants geprüft, ${nonCompliantTenants.length} mit Problemen`,
        metadata: {
          timestamp: new Date().toISOString(),
          tenantsChecked: configs.length,
          compliantCount: configs.length - nonCompliantTenants.length,
          nonCompliantCount: nonCompliantTenants.length,
          nonCompliantTenants,
        },
      },
    });

    // Telegram-Alert bei Problemen
    if (alertNeeded) {
      let message = `⚖️ <b>DSGVO Compliance Alert</b>\n\n`;
      message += `<b>Lexos-Agent hat Probleme gefunden:</b>\n\n`;

      for (const result of results) {
        if (!result.compliant) {
          message += `🔴 <b>${result.tenantName}</b>\n`;
          message += `URL: ${result.url}\n`;
          message += `Probleme:\n`;
          for (const issue of result.issues) {
            message += `  • ${issue}\n`;
          }
          message += `\n`;
        }
      }

      message += `\n⏰ ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`;
      message += `\n\n<i>Bitte Datenschutz-Pflichten prüfen und beheben.</i>`;

      await sendTelegramAlert(message);
    }

    // Erfolgs-Report zusammenstellen
    const compliantCount = results.filter(r => r.compliant).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        tenantsChecked: totalCount,
        compliant: compliantCount,
        nonCompliant: totalCount - compliantCount,
        complianceRate: totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0,
      },
      alertSent: alertNeeded,
      results,
    });
  } catch (err: any) {
    console.error("[DSGVO Compliance] Fehler:", err);
    return NextResponse.json({ error: err.message ?? "Unbekannter Fehler" }, { status: 500 });
  }
}

// POST für manuelle Trigger
export async function POST(request: Request) {
  return GET(request);
}
