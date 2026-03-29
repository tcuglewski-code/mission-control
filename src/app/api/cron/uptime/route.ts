/**
 * Uptime Monitoring Cron Route (AF012)
 * 
 * Läuft alle 5 Minuten via Vercel Cron.
 * Prüft alle konfigurierten Tenant-URLs auf Erreichbarkeit.
 * Bei Ausfall → Telegram-Alert.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

// Telegram Alert senden
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Uptime] Telegram nicht konfiguriert (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID fehlen)");
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
    console.error("[Uptime] Telegram-Fehler:", err);
    return false;
  }
}

// URL prüfen
async function checkUrl(url: string, timeout: number): Promise<{
  status: "up" | "down" | "timeout" | "error";
  statusCode?: number;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    const res = await fetch(url, {
      method: "HEAD", // Leichtgewichtig
      signal: controller.signal,
      headers: { "User-Agent": "MissionControl-UptimeMonitor/1.0" },
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // 2xx und 3xx sind OK
    if (res.status >= 200 && res.status < 400) {
      return { status: "up", statusCode: res.status, responseTime };
    }
    return { status: "down", statusCode: res.status, responseTime };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (err.name === "AbortError") {
      return { status: "timeout", responseTime, error: `Timeout nach ${timeout}s` };
    }
    return { status: "error", responseTime, error: err.message ?? "Unbekannter Fehler" };
  }
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
    status: string;
    statusCode?: number;
    responseTime?: number;
    alertSent: boolean;
  }> = [];

  try {
    // Alle aktiven Monitoring-Configs laden
    const configs = await prisma.monitoringConfig.findMany({
      where: { enabled: true },
    });

    if (configs.length === 0) {
      // Default-Tenants anlegen wenn noch keine Config existiert
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

      // Neu laden
      const newConfigs = await prisma.monitoringConfig.findMany({ where: { enabled: true } });
      configs.push(...newConfigs);
    }

    // Alle URLs parallel prüfen
    const checks = await Promise.all(
      configs.map(async (config) => {
        const result = await checkUrl(config.url, config.timeout);
        return { config, result };
      })
    );

    // Ergebnisse verarbeiten
    for (const { config, result } of checks) {
      // Check in DB speichern
      await prisma.uptimeCheck.create({
        data: {
          tenantId: config.tenantId,
          tenantName: config.tenantName,
          url: config.url,
          status: result.status,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          error: result.error,
        },
      });

      let alertSent = false;

      // Status-Änderung erkennen
      const wasUp = config.lastStatus === "up";
      const isUp = result.status === "up";

      if (!isUp) {
        // Fehler-Zähler erhöhen
        const newConsecutiveFails = config.consecutiveFails + 1;
        
        // Alert senden nach 2 aufeinanderfolgenden Fehlern (um Flapping zu vermeiden)
        if (newConsecutiveFails >= 2 && config.alertOnDown) {
          const lastAlertTime = config.lastAlertAt?.getTime() ?? 0;
          const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

          // Nicht öfter als alle 15 Minuten alerten
          if (lastAlertTime < fifteenMinutesAgo) {
            const message = `🔴 <b>Ausfall erkannt!</b>\n\n` +
              `<b>Service:</b> ${config.tenantName}\n` +
              `<b>URL:</b> ${config.url}\n` +
              `<b>Status:</b> ${result.status}${result.statusCode ? ` (${result.statusCode})` : ""}\n` +
              `<b>Fehler:</b> ${result.error ?? "Keine Details"}\n` +
              `<b>Zeit:</b> ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`;

            alertSent = await sendTelegramAlert(message);

            await prisma.monitoringConfig.update({
              where: { id: config.id },
              data: { lastAlertAt: new Date() },
            });
          }
        }

        await prisma.monitoringConfig.update({
          where: { id: config.id },
          data: {
            consecutiveFails: newConsecutiveFails,
            lastStatus: result.status,
            lastCheckedAt: new Date(),
          },
        });
      } else {
        // Service ist wieder up
        if (!wasUp && config.consecutiveFails >= 2) {
          // Recovery-Alert senden
          const message = `🟢 <b>Service wiederhergestellt!</b>\n\n` +
            `<b>Service:</b> ${config.tenantName}\n` +
            `<b>URL:</b> ${config.url}\n` +
            `<b>Response Time:</b> ${result.responseTime}ms\n` +
            `<b>Zeit:</b> ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`;

          alertSent = await sendTelegramAlert(message);
        }

        await prisma.monitoringConfig.update({
          where: { id: config.id },
          data: {
            consecutiveFails: 0,
            lastStatus: "up",
            lastCheckedAt: new Date(),
          },
        });
      }

      results.push({
        tenantId: config.tenantId,
        tenantName: config.tenantName,
        url: config.url,
        status: result.status,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        alertSent,
      });
    }

    // Alte Checks aufräumen (älter als 7 Tage)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.uptimeCheck.deleteMany({
      where: { checkedAt: { lt: sevenDaysAgo } },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checksPerformed: results.length,
      results,
    });
  } catch (err: any) {
    console.error("[Uptime Cron] Fehler:", err);
    return NextResponse.json({ error: err.message ?? "Unbekannter Fehler" }, { status: 500 });
  }
}

// POST für manuelle Trigger
export async function POST(request: Request) {
  return GET(request);
}
