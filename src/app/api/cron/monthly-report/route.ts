import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";
import { subDays, format, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

/**
 * GET /api/cron/monthly-report
 * 
 * Vercel Cron: 1. jeden Monats um 09:00 UTC
 * 
 * Generiert monatlichen Kunden-Report für jeden Tenant:
 * - Uptime-Statistik
 * - Offene Bugs/Tickets
 * - Aktivitäten (neue Features, Änderungen)
 * - Nutzungsstatistik (Tasks, API-Usage)
 * 
 * Output: Telegram + optional Email
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized — CRON_SECRET erforderlich" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const lastMonthStart = startOfMonth(subDays(now, 30));
    const lastMonthEnd = endOfMonth(subDays(now, 30));

    // Alle Tenants aus MonitoringConfig laden
    const tenants = await prisma.monitoringConfig.findMany({
      where: { enabled: true },
    });

    if (tenants.length === 0) {
      console.log("[MONTHLY REPORT] Keine Tenants konfiguriert");
      return NextResponse.json({ 
        message: "Keine Tenants konfiguriert",
        timestamp: now.toISOString()
      });
    }

    const reports: TenantReport[] = [];

    for (const tenant of tenants) {
      const report = await generateTenantReport(tenant, thirtyDaysAgo, now);
      reports.push(report);
    }

    // Gesamt-Report generieren
    const summaryMessage = generateSummaryMessage(reports, lastMonthStart, lastMonthEnd);

    // Via Telegram senden
    const telegramResult = await sendTelegramReport(summaryMessage);

    // Optional: Via Email senden (wenn SMTP konfiguriert)
    const emailResult = await sendEmailReport(reports, lastMonthStart, lastMonthEnd);

    // Audit-Log erstellen
    await prisma.activityLog.create({
      data: {
        action: "MONTHLY_REPORT_GENERATED",
        entityType: "report",
        entityId: "monthly",
        entityName: "Monatlicher Kunden-Report",
        details: {
          tenantsCount: tenants.length,
          reports: reports.map(r => ({
            tenantId: r.tenantId,
            tenantName: r.tenantName,
            uptimePercent: r.uptimePercent,
            openBugs: r.openBugs,
            activities: r.activities,
          })),
          telegramSent: telegramResult.success,
          emailSent: emailResult.success,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      period: {
        start: format(lastMonthStart, "dd.MM.yyyy", { locale: de }),
        end: format(lastMonthEnd, "dd.MM.yyyy", { locale: de }),
      },
      tenantsProcessed: tenants.length,
      reports: reports.map(r => ({
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        uptimePercent: r.uptimePercent,
        openBugs: r.openBugs,
        activities: r.activities,
        tasksCompleted: r.tasksCompleted,
      })),
      telegram: telegramResult,
      email: emailResult,
    });
  } catch (error) {
    console.error("[CRON /api/cron/monthly-report]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST alias für manuelle Ausführung
export async function POST(req: NextRequest) {
  return GET(req);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantReport {
  tenantId: string;
  tenantName: string;
  url: string;
  uptimePercent: number;
  uptimeChecks: number;
  downtimeMinutes: number;
  openBugs: number;
  criticalBugs: number;
  activities: number;
  newFeatures: string[];
  tasksCompleted: number;
  apiUsage: {
    totalCalls: number;
    costUsd: number;
  };
}

// ─── Report Generation ────────────────────────────────────────────────────────
async function generateTenantReport(
  tenant: { tenantId: string; tenantName: string; url: string },
  startDate: Date,
  endDate: Date
): Promise<TenantReport> {
  // 1. Uptime-Statistik
  const uptimeChecks = await prisma.uptimeCheck.findMany({
    where: {
      tenantId: tenant.tenantId,
      checkedAt: { gte: startDate, lte: endDate },
    },
  });

  const totalChecks = uptimeChecks.length;
  const upChecks = uptimeChecks.filter(c => c.status === "up").length;
  const uptimePercent = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 100;
  
  // Downtime in Minuten schätzen (5 Min Check-Intervall)
  const downChecks = totalChecks - upChecks;
  const downtimeMinutes = downChecks * 5;

  // 2. Offene Bugs (Tickets mit status open/in_progress und category bug)
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["open", "in_progress"] },
      category: "bug",
    },
  });

  const openBugs = tickets.length;
  const criticalBugs = tickets.filter(t => t.priority === "critical").length;

  // 3. Aktivitäten / Features (aus ActivityLog)
  const activities = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      action: { in: ["created", "TASK_COMPLETED", "pushed", "FEATURE_DEPLOYED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Features extrahieren (aus commit messages oder task titles)
  const newFeatures = activities
    .filter(a => 
      a.action === "FEATURE_DEPLOYED" || 
      (a.action === "pushed" && a.entityName?.toLowerCase().includes("feature"))
    )
    .map(a => a.entityName)
    .slice(0, 5);

  // 4. Tasks abgeschlossen
  const completedTasks = await prisma.task.count({
    where: {
      status: "done",
      updatedAt: { gte: startDate, lte: endDate },
    },
  });

  // 5. API-Usage (LLM-Kosten)
  const aiUsage = await prisma.aiUsage.aggregate({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      costUsd: true,
    },
    _count: true,
  });

  return {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    url: tenant.url,
    uptimePercent,
    uptimeChecks: totalChecks,
    downtimeMinutes,
    openBugs,
    criticalBugs,
    activities: activities.length,
    newFeatures,
    tasksCompleted: completedTasks,
    apiUsage: {
      totalCalls: aiUsage._count,
      costUsd: aiUsage._sum.costUsd ?? 0,
    },
  };
}

// ─── Telegram Message ─────────────────────────────────────────────────────────
function generateSummaryMessage(
  reports: TenantReport[],
  monthStart: Date,
  monthEnd: Date
): string {
  const monthName = format(monthStart, "MMMM yyyy", { locale: de });
  
  let message = `📊 *Monatlicher Feldhub-Report*\n`;
  message += `📅 ${monthName}\n\n`;

  // Gesamt-Statistik
  const avgUptime = reports.length > 0 
    ? (reports.reduce((sum, r) => sum + r.uptimePercent, 0) / reports.length).toFixed(2)
    : "100.00";
  const totalBugs = reports.reduce((sum, r) => sum + r.openBugs, 0);
  const totalTasks = reports.reduce((sum, r) => sum + r.tasksCompleted, 0);
  const totalCost = reports.reduce((sum, r) => sum + r.apiUsage.costUsd, 0);

  message += `🌐 *Gesamt-Übersicht*\n`;
  message += `├ Tenants: ${reports.length}\n`;
  message += `├ Ø Uptime: ${avgUptime}%\n`;
  message += `├ Offene Bugs: ${totalBugs}\n`;
  message += `├ Tasks erledigt: ${totalTasks}\n`;
  message += `└ API-Kosten: $${totalCost.toFixed(2)}\n\n`;

  // Pro Tenant
  message += `📋 *Details pro Tenant*\n`;
  
  for (const report of reports) {
    const uptimeEmoji = report.uptimePercent >= 99.9 ? "🟢" : 
                        report.uptimePercent >= 99 ? "🟡" : "🔴";
    const bugEmoji = report.criticalBugs > 0 ? "🔴" : 
                     report.openBugs > 0 ? "🟡" : "🟢";

    message += `\n*${report.tenantName}*\n`;
    message += `├ ${uptimeEmoji} Uptime: ${report.uptimePercent}%`;
    if (report.downtimeMinutes > 0) {
      message += ` (${report.downtimeMinutes} Min. Down)`;
    }
    message += `\n`;
    message += `├ ${bugEmoji} Bugs: ${report.openBugs}`;
    if (report.criticalBugs > 0) {
      message += ` (${report.criticalBugs} kritisch!)`;
    }
    message += `\n`;
    message += `├ 📈 Aktivitäten: ${report.activities}\n`;
    message += `└ ✅ Tasks: ${report.tasksCompleted}\n`;

    // Neue Features auflisten
    if (report.newFeatures.length > 0) {
      message += `   📦 Features: ${report.newFeatures.slice(0, 3).join(", ")}\n`;
    }
  }

  message += `\n─────────────────\n`;
  message += `🤖 Automatisch generiert von Amadeus\n`;
  message += `📅 ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`;

  return message;
}

// ─── Telegram Sender ──────────────────────────────────────────────────────────
async function sendTelegramReport(message: string): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[MONTHLY REPORT] Telegram nicht konfiguriert");
    return { success: false, error: "Telegram nicht konfiguriert" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Telegram API Error: ${errBody}`);
    }

    console.log("[MONTHLY REPORT] Telegram-Report gesendet");
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("[MONTHLY REPORT] Telegram-Fehler:", errMsg);
    return { success: false, error: errMsg };
  }
}

// ─── Email Sender (optional) ──────────────────────────────────────────────────
async function sendEmailReport(
  reports: TenantReport[],
  monthStart: Date,
  monthEnd: Date
): Promise<{ success: boolean; error?: string }> {
  // Prüfe ob SMTP konfiguriert ist
  const smtpHost = process.env.SMTP_HOST;
  const smtpPass = process.env.SMTP_PASS;
  const reportEmail = process.env.MONTHLY_REPORT_EMAIL;

  if (!smtpHost || !smtpPass || !reportEmail) {
    return { success: false, error: "Email nicht konfiguriert (SMTP oder MONTHLY_REPORT_EMAIL fehlt)" };
  }

  // Email-HTML generieren
  const monthName = format(monthStart, "MMMM yyyy", { locale: de });
  const html = generateEmailHtml(reports, monthName);

  try {
    // Nutze zentrale Email-Library (falls vorhanden)
    const emailModule = await import("@/lib/email").catch(() => null);
    
    if (emailModule?.sendEmail) {
      const result = await emailModule.sendEmail({
        to: reportEmail,
        subject: `📊 Monatlicher Feldhub-Report — ${monthName}`,
        html,
      });
      return { success: result.success, error: result.error };
    }

    // Fallback: Resend API
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Mission Control <noreply@feldhub.de>",
          to: reportEmail,
          subject: `📊 Monatlicher Feldhub-Report — ${monthName}`,
          html,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Resend API Fehler: ${errBody}`);
      }

      return { success: true };
    }

    return { success: false, error: "Kein Email-Provider konfiguriert" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
    return { success: false, error: errMsg };
  }
}

// ─── Email HTML Template ──────────────────────────────────────────────────────
function generateEmailHtml(reports: TenantReport[], monthName: string): string {
  const avgUptime = reports.length > 0
    ? (reports.reduce((sum, r) => sum + r.uptimePercent, 0) / reports.length).toFixed(2)
    : "100.00";
  const totalBugs = reports.reduce((sum, r) => sum + r.openBugs, 0);
  const totalTasks = reports.reduce((sum, r) => sum + r.tasksCompleted, 0);
  const totalCost = reports.reduce((sum, r) => sum + r.apiUsage.costUsd, 0);

  const tenantRows = reports.map(r => {
    const uptimeColor = r.uptimePercent >= 99.9 ? "#22c55e" : r.uptimePercent >= 99 ? "#eab308" : "#ef4444";
    const bugColor = r.criticalBugs > 0 ? "#ef4444" : r.openBugs > 0 ? "#eab308" : "#22c55e";
    
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${r.tenantName}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${uptimeColor};margin-right:6px;"></span>
          ${r.uptimePercent}%
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${bugColor};margin-right:6px;"></span>
          ${r.openBugs}${r.criticalBugs > 0 ? ` (${r.criticalBugs} kritisch)` : ""}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${r.tasksCompleted}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">$${r.apiUsage.costUsd.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Monatlicher Feldhub-Report — ${monthName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#2C3A1C;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">📊 Monatlicher Feldhub-Report</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:16px;">${monthName}</p>
    </div>

    <!-- Summary Stats -->
    <div style="padding:24px 40px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
        <div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:28px;font-weight:700;color:#2C3A1C;">${reports.length}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Tenants</div>
        </div>
        <div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:28px;font-weight:700;color:#22c55e;">${avgUptime}%</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Ø Uptime</div>
        </div>
        <div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:28px;font-weight:700;color:${totalBugs > 0 ? "#eab308" : "#22c55e"};">${totalBugs}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Offene Bugs</div>
        </div>
        <div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:28px;font-weight:700;color:#2C3A1C;">${totalTasks}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Tasks erledigt</div>
        </div>
        <div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:28px;font-weight:700;color:#3b82f6;">$${totalCost.toFixed(2)}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">API-Kosten</div>
        </div>
      </div>
    </div>

    <!-- Details Table -->
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Details pro Tenant</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px;text-align:left;font-weight:600;color:#374151;">Tenant</th>
            <th style="padding:12px;text-align:left;font-weight:600;color:#374151;">Uptime</th>
            <th style="padding:12px;text-align:left;font-weight:600;color:#374151;">Bugs</th>
            <th style="padding:12px;text-align:left;font-weight:600;color:#374151;">Tasks</th>
            <th style="padding:12px;text-align:left;font-weight:600;color:#374151;">API $</th>
          </tr>
        </thead>
        <tbody>
          ${tenantRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        🤖 Automatisch generiert von Amadeus · ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}<br>
        Feldhub — Digitale Betriebssysteme für KMU im Außendienst
      </p>
    </div>
  </div>
</body>
</html>`;
}
