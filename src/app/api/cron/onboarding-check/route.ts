/**
 * Cleo-Agent: Onboarding-Fortschritt Tracker (AF083)
 * 
 * Läuft täglich via Vercel Cron.
 * Prüft alle aktiven Customer Onboardings auf:
 * - Fehlende Schritte basierend auf Woche
 * - Stale Onboardings (keine Fortschritte seit X Tagen)
 * - Überfällige Go-Live-Termine
 * 
 * Bei Problemen → Telegram/Slack Alert an Tomek
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

// Telegram Alert senden
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Cleo] Telegram nicht konfiguriert");
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
    console.error("[Cleo] Telegram-Fehler:", err);
    return false;
  }
}

// Onboarding-Checkpoints je Woche
const CHECKPOINTS_BY_WEEK: Record<number, { field: string; label: string }[]> = {
  1: [
    { field: "w1_kickoff", label: "Kickoff-Meeting" },
    { field: "w1_requirements", label: "Anforderungs-Workshop" },
    { field: "w1_configPlan", label: "Konfigurationsplan" },
  ],
  2: [
    { field: "w2_domain", label: "Domain eingerichtet" },
    { field: "w2_database", label: "Datenbank angelegt" },
    { field: "w2_appSetup", label: "App-Setup" },
    { field: "w2_dataImport", label: "Datenimport" },
  ],
  3: [
    { field: "w3_adminTraining", label: "Admin-Schulung" },
    { field: "w3_workerTraining", label: "Mitarbeiter-Schulung" },
    { field: "w3_testRun", label: "Testbetrieb" },
  ],
  4: [
    { field: "w4_finalCheck", label: "Finaler Check" },
    { field: "w4_goLive", label: "Go-Live" },
    { field: "w4_supportHandover", label: "Support-Übergabe" },
  ],
};

// Berechne Onboarding-Fortschritt in Prozent
function calculateProgress(onboarding: any): number {
  const checkpoints = [
    "w1_kickoff", "w1_requirements", "w1_configPlan",
    "w2_domain", "w2_database", "w2_appSetup", "w2_dataImport",
    "w3_adminTraining", "w3_workerTraining", "w3_testRun",
    "w4_finalCheck", "w4_goLive", "w4_supportHandover",
  ];
  const completed = checkpoints.filter(c => onboarding[c] === true).length;
  return Math.round((completed / checkpoints.length) * 100);
}

// Fehlende Checkpoints für aktuelle + vergangene Wochen ermitteln
function getMissingCheckpoints(onboarding: any): string[] {
  const missing: string[] = [];
  const currentWeek = onboarding.week || 1;

  for (let week = 1; week <= currentWeek; week++) {
    const weekCheckpoints = CHECKPOINTS_BY_WEEK[week] || [];
    for (const cp of weekCheckpoints) {
      if (!onboarding[cp.field]) {
        missing.push(`W${week}: ${cp.label}`);
      }
    }
  }

  return missing;
}

// Prüfe ob Onboarding "stale" ist (keine Updates seit X Tagen)
function isStale(onboarding: any, threshold: number): boolean {
  const lastUpdate = new Date(onboarding.updatedAt).getTime();
  const now = Date.now();
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate > threshold;
}

// Prüfe ob Go-Live überfällig ist
function isOverdue(onboarding: any): boolean {
  if (!onboarding.targetGoLive || onboarding.status === "completed") return false;
  const target = new Date(onboarding.targetGoLive).getTime();
  return Date.now() > target;
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
    status: string;
    progress: number;
    issues: string[];
    reminderSent: boolean;
  }> = [];

  try {
    // Config laden oder Default erstellen
    let config = await prisma.onboardingCheckConfig.findUnique({
      where: { id: "singleton" },
    });

    if (!config) {
      config = await prisma.onboardingCheckConfig.create({
        data: { id: "singleton" },
      });
    }

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        message: "Cleo-Agent ist deaktiviert",
        checksPerformed: 0,
      });
    }

    // Alle aktiven Onboardings laden
    const onboardings = await prisma.customerOnboarding.findMany({
      where: {
        status: { in: ["in_progress", "paused"] },
      },
    });

    if (onboardings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Keine aktiven Onboardings gefunden",
        checksPerformed: 0,
      });
    }

    const alerts: string[] = [];

    for (const onboarding of onboardings) {
      const issues: string[] = [];
      const progress = calculateProgress(onboarding);

      // 1. Fehlende Checkpoints für aktuelle Woche
      const missing = getMissingCheckpoints(onboarding);
      if (missing.length > 0) {
        issues.push(`${missing.length} offene Checkpoints`);
      }

      // 2. Stale Check
      if (isStale(onboarding, config.staleDaysThreshold)) {
        issues.push(`Kein Fortschritt seit ${config.staleDaysThreshold}+ Tagen`);
      }

      // 3. Überfälliges Go-Live
      if (isOverdue(onboarding)) {
        issues.push("Go-Live-Termin überschritten!");
      }

      // 4. Vertrag/AVV fehlt bei fortgeschrittenem Onboarding
      if (progress > 25 && !onboarding.contractSigned) {
        issues.push("Vertrag noch nicht unterschrieben");
      }
      if (progress > 50 && !onboarding.avvSigned) {
        issues.push("AVV fehlt noch");
      }

      // Reminder senden wenn Issues vorhanden
      let reminderSent = false;
      if (issues.length > 0) {
        // Cooldown prüfen
        const lastReminder = onboarding.lastReminderSentAt?.getTime() ?? 0;
        const cooldownMs = config.reminderCooldownDays * 24 * 60 * 60 * 1000;
        const canSendReminder = (Date.now() - lastReminder) > cooldownMs;

        if (canSendReminder) {
          // Alert-Nachricht erstellen
          const alertMsg =
            `🔔 <b>Onboarding-Alert: ${onboarding.tenantName}</b>\n\n` +
            `<b>Status:</b> ${onboarding.status} (Woche ${onboarding.week})\n` +
            `<b>Fortschritt:</b> ${progress}%\n` +
            `<b>Probleme:</b>\n${issues.map(i => `• ${i}`).join("\n")}\n` +
            (missing.length > 0 ? `\n<b>Offene Checkpoints:</b>\n${missing.slice(0, 5).map(m => `• ${m}`).join("\n")}` : "") +
            (onboarding.contactName ? `\n\n<b>Kontakt:</b> ${onboarding.contactName}` : "") +
            (onboarding.ownerName ? `\n<b>Zuständig:</b> ${onboarding.ownerName}` : "");

          alerts.push(alertMsg);

          // Reminder-Tracking updaten
          await prisma.customerOnboarding.update({
            where: { id: onboarding.id },
            data: {
              lastReminderSentAt: new Date(),
              reminderCount: { increment: 1 },
            },
          });

          reminderSent = true;
        }
      }

      results.push({
        tenantId: onboarding.tenantId,
        tenantName: onboarding.tenantName,
        status: onboarding.status,
        progress,
        issues,
        reminderSent,
      });
    }

    // Telegram-Alerts senden (gesammelt)
    let alertSent = false;
    if (alerts.length > 0 && config.alertTelegram) {
      const summaryHeader = `🤖 <b>Cleo-Agent: Onboarding-Review</b>\n` +
        `<i>${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</i>\n\n` +
        `${alerts.length} Kunde(n) mit offenen Punkten:\n\n`;

      // Bei vielen Alerts: nur Zusammenfassung + ersten Alert
      if (alerts.length <= 3) {
        for (const alert of alerts) {
          await sendTelegramAlert(alert);
        }
        alertSent = true;
      } else {
        // Zusammenfassung
        const summaryList = results
          .filter(r => r.issues.length > 0)
          .map(r => `• ${r.tenantName}: ${r.progress}% (${r.issues.length} Issues)`)
          .join("\n");
        await sendTelegramAlert(summaryHeader + summaryList);
        alertSent = true;
      }
    }

    // ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "ONBOARDING_CHECK",
        entityType: "system",
        entityId: "cleo-agent",
        entityName: "Cleo-Agent: Onboarding Check",
        metadata: JSON.stringify({
          onboardingsChecked: results.length,
          withIssues: results.filter(r => r.issues.length > 0).length,
          remindersSent: results.filter(r => r.reminderSent).length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checksPerformed: results.length,
      withIssues: results.filter(r => r.issues.length > 0).length,
      alertSent,
      results,
    });
  } catch (err: any) {
    console.error("[Cleo] Fehler:", err);

    // Fehler-Log
    await prisma.activityLog.create({
      data: {
        action: "ONBOARDING_CHECK_ERROR",
        entityType: "system",
        entityId: "cleo-agent",
        entityName: "Cleo-Agent Error",
        metadata: JSON.stringify({ error: err.message }),
      },
    });

    return NextResponse.json({ error: err.message ?? "Unbekannter Fehler" }, { status: 500 });
  }
}

// POST für manuelle Trigger
export async function POST(request: Request) {
  return GET(request);
}
