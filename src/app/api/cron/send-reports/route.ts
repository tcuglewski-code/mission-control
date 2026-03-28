import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, isWithinInterval, format } from "date-fns";
import { de } from "date-fns/locale";

// POST /api/cron/send-reports — Vercel Cron: Montag 06:00 UTC
// Sendet wöchentliche Status-Reports an konfigurierte E-Mail-Adressen
export async function GET(req: NextRequest) {
  // Vercel Cron Security: Authorization-Header prüfen
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const weekInterval = { start: sevenDaysAgo, end: now };

    // Alle aktiven Schedules laden
    const schedules = await prisma.projectReportSchedule.findMany({
      where: { active: true },
    });

    const results: Array<{ projectId: string; emails: string[]; status: string; error?: string }> = [];

    for (const schedule of schedules) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: schedule.projectId },
          include: {
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                updatedAt: true,
                createdAt: true,
                assignee: { select: { name: true } },
              },
            },
            milestones: {
              select: {
                id: true,
                title: true,
                status: true,
                progress: true,
                dueDate: true,
              },
            },
            members: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        });

        if (!project) {
          results.push({ projectId: schedule.projectId, emails: schedule.emails, status: "skipped", error: "Projekt nicht gefunden" });
          continue;
        }

        // Daten aufbereiten
        const completedThisWeek = project.tasks.filter(
          (t) =>
            t.status === "done" &&
            isWithinInterval(new Date(t.updatedAt), weekInterval)
        );
        const openTasks = project.tasks.filter(
          (t) => t.status !== "done" && t.status !== "cancelled"
        );
        const overdueTasks = openTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now
        );
        const activeMilestones = project.milestones.filter(
          (m) => m.status !== "completed" && m.status !== "cancelled"
        );

        const weekRange = `${format(sevenDaysAgo, "d. MMM", { locale: de })} – ${format(now, "d. MMMM yyyy", { locale: de })}`;
        const reportDate = format(now, "d. MMMM yyyy", { locale: de });

        // E-Mail-Inhalt generieren (HTML)
        const emailHtml = generateReportEmail({
          project: {
            name: project.name,
            status: project.status,
            progress: project.progress,
            color: project.color,
          },
          weekRange,
          reportDate,
          completedThisWeek: completedThisWeek.map((t) => ({
            title: t.title,
            assignee: t.assignee?.name ?? null,
          })),
          openTasks: openTasks.length,
          overdueTasks: overdueTasks.length,
          activeMilestones: activeMilestones.map((m) => ({
            title: m.title,
            progress: m.progress,
            dueDate: m.dueDate ? format(new Date(m.dueDate), "d. MMM yyyy", { locale: de }) : null,
          })),
        });

        // E-Mail versenden (via Resend oder SMTP — hier als Stub mit fetch zu Resend API)
        if (process.env.RESEND_API_KEY) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM ?? "Mission Control <noreply@mission-control.app>",
              to: schedule.emails,
              subject: `📊 Wöchentlicher Status-Report: ${project.name} (${weekRange})`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            const errBody = await emailResponse.text();
            throw new Error(`Resend API Fehler: ${errBody}`);
          }
        }

        // lastSent aktualisieren
        await prisma.projectReportSchedule.update({
          where: { id: schedule.id },
          data: { lastSent: now },
        });

        results.push({ projectId: schedule.projectId, emails: schedule.emails, status: "sent" });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
        results.push({
          projectId: schedule.projectId,
          emails: schedule.emails,
          status: "error",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      processed: schedules.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON /api/cron/send-reports]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST alias für manuelle Ausführung
export async function POST(req: NextRequest) {
  return GET(req);
}

// ─── E-Mail-Template ──────────────────────────────────────────────────────────
function generateReportEmail(data: {
  project: { name: string; status: string; progress: number; color: string };
  weekRange: string;
  reportDate: string;
  completedThisWeek: Array<{ title: string; assignee: string | null }>;
  openTasks: number;
  overdueTasks: number;
  activeMilestones: Array<{ title: string; progress: number; dueDate: string | null }>;
}): string {
  const statusLabel: Record<string, string> = {
    active: "Aktiv",
    in_progress: "In Bearbeitung",
    completed: "Abgeschlossen",
    on_hold: "Pausiert",
    cancelled: "Abgebrochen",
  };

  const completedListHtml = data.completedThisWeek.length > 0
    ? data.completedThisWeek
        .map(
          (t) =>
            `<li style="margin-bottom:6px;">✅ ${t.title}${t.assignee ? ` <span style="color:#6b7280">(${t.assignee})</span>` : ""}</li>`
        )
        .join("")
    : `<li style="color:#6b7280;">Keine Tasks diese Woche abgeschlossen</li>`;

  const milestonesHtml = data.activeMilestones.length > 0
    ? data.activeMilestones
        .map(
          (m) =>
            `<li style="margin-bottom:8px;">
              <strong>${m.title}</strong> — ${m.progress}% abgeschlossen
              ${m.dueDate ? `<br><span style="color:#6b7280;font-size:12px;">Fällig: ${m.dueDate}</span>` : ""}
            </li>`
        )
        .join("")
    : `<li style="color:#6b7280;">Keine aktiven Meilensteine</li>`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Status-Report: ${data.project.name}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:${data.project.color};padding:32px 40px 24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff;">${data.project.name[0]}</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${data.project.name}</h1>
      </div>
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Wöchentlicher Status-Report · ${data.weekRange}</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Erstellt am ${data.reportDate}</p>
    </div>

    <!-- Status Badge -->
    <div style="padding:20px 40px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Status</span>
          <div style="margin-top:2px;font-weight:600;color:#111827;">${statusLabel[data.project.status] ?? data.project.status}</div>
        </div>
        <div>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Fortschritt</span>
          <div style="margin-top:2px;font-weight:600;color:#111827;">${data.project.progress}%</div>
        </div>
        <div>
          <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Offene Tasks</span>
          <div style="margin-top:2px;font-weight:600;color:#111827;">${data.openTasks}</div>
        </div>
        ${data.overdueTasks > 0 ? `
        <div>
          <span style="font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;">Überfällig</span>
          <div style="margin-top:2px;font-weight:600;color:#dc2626;">${data.overdueTasks}</div>
        </div>` : ""}
      </div>
      <!-- Fortschrittsbalken -->
      <div style="margin-top:16px;background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;">
        <div style="width:${data.project.progress}%;background:${data.project.color};height:100%;border-radius:999px;"></div>
      </div>
    </div>

    <!-- Inhalt -->
    <div style="padding:32px 40px;">
      <!-- Abgeschlossene Tasks -->
      <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">✅ Abgeschlossene Tasks (letzte 7 Tage)</h2>
      <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">
        ${completedListHtml}
      </ul>

      <!-- Meilensteine -->
      <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">🚩 Aktive Meilensteine</h2>
      <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">
        ${milestonesHtml}
      </ul>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        Koch Aufforstung GmbH · Mission Control<br>
        Dieser Report wurde automatisch generiert.
      </p>
    </div>
  </div>
</body>
</html>`;
}
