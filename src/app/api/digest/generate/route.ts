import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { startOfDay, subDays, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { format } from "date-fns";

// POST /api/digest/generate
// Generiert einen KI-Tagesdigest für die letzten 24 Stunden

async function kiDigestGenerieren(prompt: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    }
  }

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
  }

  // Fallback: Strukturierter Digest ohne KI
  return null as any;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jetzt = new Date();
    const vor24h = subDays(jetzt, 1);
    const heute = startOfDay(jetzt);

    // Tasks der letzten 24 Stunden abrufen
    const [neueTask, aktualisierteTasks, fertigeTasks, alleTasks] = await Promise.all([
      // Neu erstellt
      prisma.task.findMany({
        where: { createdAt: { gte: vor24h } },
        include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Aktualisiert (aber nicht neu)
      prisma.task.findMany({
        where: {
          updatedAt: { gte: vor24h },
          createdAt: { lt: vor24h },
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      // Abgeschlossen
      prisma.task.findMany({
        where: {
          status: "done",
          updatedAt: { gte: vor24h },
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      // Alle offenen Tasks
      prisma.task.findMany({
        where: { status: { in: ["todo", "in_progress", "blocked"] } },
        select: { id: true, status: true, priority: true, title: true },
      }),
    ]);

    const blockierteTasks = alleTasks.filter((t) => t.status === "blocked");
    const hochprioritaet = alleTasks.filter(
      (t) => t.priority === "urgent" || t.priority === "high"
    );

    // ─── Ungelesene Notifications pro Projekt sammeln ───────────────────────
    const ungeleseneNotifs = await prisma.notification.findMany({
      where: { read: false, createdAt: { gte: vor24h } },
      orderBy: { createdAt: "desc" },
    });

    // Nach Typ gruppieren für die KI-Zusammenfassung
    const notifByType: Record<string, number> = {};
    for (const n of ungeleseneNotifs) {
      notifByType[n.type] = (notifByType[n.type] ?? 0) + 1;
    }

    // KI-Zusammenfassung erstellen
    const prompt = `Du bist der KI-Assistent für Mission Control, das Projektmanagementsystem der Koch Aufforstung GmbH.

Erstelle einen täglichen Morning Briefing Report für ${format(jetzt, "EEEE, d. MMMM yyyy", { locale: de })}.

## Daten der letzten 24 Stunden:

**Neue Tasks (${neueTask.length}):**
${neueTask.slice(0, 10).map((t) => `- [${t.priority}] ${t.title}${t.project ? ` (${t.project.name})` : ""}`).join("\n") || "Keine neuen Tasks"}

**Fertiggestellte Tasks (${fertigeTasks.length}):**
${fertigeTasks.slice(0, 10).map((t) => `- ${t.title}${t.project ? ` (${t.project.name})` : ""}`).join("\n") || "Keine Tasks abgeschlossen"}

**Aktualisierte Tasks (${aktualisierteTasks.length}):**
${aktualisierteTasks.slice(0, 8).map((t) => `- ${t.title}`).join("\n") || "Keine Aktualisierungen"}

**Ungelesene Benachrichtigungen:**
${Object.entries(notifByType).map(([type, count]) => `- ${type}: ${count}`).join("\n") || "Keine ungelesenen Benachrichtigungen"}

**Gesamtüberblick:**
- Offen: ${alleTasks.filter((t) => t.status === "todo").length} Tasks
- In Arbeit: ${alleTasks.filter((t) => t.status === "in_progress").length} Tasks
- Blockiert: ${blockierteTasks.length} Tasks
- Hohe Priorität: ${hochprioritaet.length} Tasks

Erstelle eine strukturierte Markdown-Zusammenfassung mit:
1. 🌅 **Heutiger Überblick** (2-3 Sätze)
2. ✅ **Was wurde erledigt?**
3. 🔄 **Was ist in Arbeit?**
4. 🚫 **Was ist blockiert/dringend?**
5. 🔔 **Benachrichtigungen** (nur wenn vorhanden)
6. 📋 **Empfehlungen für heute** (3 konkrete Punkte)

Sprache: Deutsch. Ton: Professionell, motivierend, präzise. Max 400 Wörter.`;

    let inhalt: string;

    try {
      inhalt = await kiDigestGenerieren(prompt);
      if (!inhalt) throw new Error("Keine KI-Antwort");
    } catch {
      // Fallback ohne KI
      const notifSummary = Object.entries(notifByType)
        .map(([type, count]) => {
          const labels: Record<string, string> = {
            task_assigned: "Task-Zuweisungen",
            task_status_changed: "Status-Änderungen",
            comment_added: "Neue Kommentare",
            milestone_due: "Fällige Meilensteine",
            sprint_completed: "Abgeschlossene Sprints",
            mention: "Erwähnungen",
          };
          return `- ${labels[type] ?? type}: ${count}`;
        })
        .join("\n");

      inhalt = `# 📊 Tagesdigest — ${format(jetzt, "d. MMMM yyyy", { locale: de })}

## 🌅 Heutiger Überblick
Automatisch generierter Digest für Mission Control (Koch Aufforstung GmbH).

## ✅ Fertiggestellt (letzte 24h)
${fertigeTasks.length > 0 ? fertigeTasks.map((t) => `- ${t.title}`).join("\n") : "_Keine Tasks abgeschlossen_"}

## 🆕 Neu erstellt
${neueTask.length > 0 ? neueTask.map((t) => `- [${t.priority}] ${t.title}`).join("\n") : "_Keine neuen Tasks_"}

## 🚫 Blockiert
${blockierteTasks.length > 0 ? blockierteTasks.map((t) => `- ${t.title}`).join("\n") : "_Keine blockierten Tasks_"}

${ungeleseneNotifs.length > 0 ? `## 🔔 Ungelesene Benachrichtigungen\n${notifSummary}` : ""}

## 📊 Statistik
- Offene Tasks: ${alleTasks.filter((t) => t.status === "todo").length}
- In Arbeit: ${alleTasks.filter((t) => t.status === "in_progress").length}
- Hohe Priorität: ${hochprioritaet.length}

_Digest generiert am ${format(jetzt, "d. MMMM yyyy, HH:mm", { locale: de })} Uhr_`;
    }

    // ─── Email-Digest versenden (Benutzer mit notifEmailDigest=true) ────────
    void sendEmailDigests(inhalt, notifByType, ungeleseneNotifs.length);

    // Digest in DB speichern (upsert für heute)
    const digest = await prisma.dailyDigest.upsert({
      where: { datum: heute },
      update: {
        inhalt,
        tasksDone: fertigeTasks.length,
        tasksOffen: alleTasks.filter((t) => t.status !== "done").length,
        tasksNeu: neueTask.length,
      },
      create: {
        datum: heute,
        inhalt,
        tasksDone: fertigeTasks.length,
        tasksOffen: alleTasks.filter((t) => t.status !== "done").length,
        tasksNeu: neueTask.length,
      },
    });

    return NextResponse.json(digest);
  } catch (error: any) {
    console.error("[POST /api/digest/generate]", error);
    return NextResponse.json({ error: error.message ?? "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * Versendet Email-Digests an alle Benutzer mit ungelesenen Notifications.
 */
/**
 * Baut das HTML für den E-Mail-Digest.
 * Wird auch für die Digest-Vorschau unter /settings/notifications/digest-preview verwendet.
 */
export function buildDigestEmailHtml(params: {
  baseUrl: string;
  username: string;
  email: string;
  userId: string;
  notifications: Array<{ id: string; type: string; title: string; message: string; link?: string | null; createdAt: Date | string }>;
  neueAufgaben: number;
  faelligeAufgaben: number;
  neueKommentare: number;
  digestDatum?: string;
}): string {
  const {
    baseUrl, username, email, userId, notifications,
    neueAufgaben, faelligeAufgaben, neueKommentare, digestDatum,
  } = params;

  const unsubscribeUrl = `${baseUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(email)}&token=${Buffer.from(userId).toString("base64")}`;
  const notificationsUrl = `${baseUrl}/notifications`;
  const today = digestDatum ?? new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const typeLabels: Record<string, string> = {
    task_assigned: "📋 Task-Zuweisungen",
    task_status_changed: "🔄 Status-Änderungen",
    comment_added: "💬 Neue Kommentare",
    milestone_due: "🏁 Fällige Meilensteine",
    sprint_completed: "✅ Abgeschlossene Sprints",
    mention: "@ Erwähnungen",
    new_email: "📧 E-Mails",
    task_update: "🔄 Task-Updates",
    deadline: "⏰ Deadlines",
  };

  // Nach Typ gruppieren
  const grouped: Record<string, typeof notifications> = {};
  for (const n of notifications) {
    if (!grouped[n.type]) grouped[n.type] = [];
    grouped[n.type].push(n);
  }

  const notifSektionen = Object.entries(grouped).map(([type, notifs]) => {
    const label = typeLabels[type] ?? type;
    const items = notifs.map((n) => {
      const linkHtml = n.link
        ? `<a href="${baseUrl}${n.link}" style="color:#10b981;text-decoration:none;font-size:12px;margin-left:8px;">Ansehen →</a>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
            <div style="font-size:13px;font-weight:600;color:#e5e5e5;">${n.title}${linkHtml}</div>
            <div style="font-size:12px;color:#888;margin-top:3px;">${n.message}</div>
          </td>
        </tr>`;
    }).join("");

    return `
      <tr>
        <td style="padding:20px 0 8px;">
          <div style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
        </td>
      </tr>
      ${items}`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Control Tagesdigest</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f1f0f 0%,#0a1a0a 100%);border:1px solid #1a3a1a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;background:#10b981;border-radius:10px;display:inline-block;line-height:40px;text-align:center;font-size:20px;">🌲</div>
                <div style="text-align:left;">
                  <div style="font-size:18px;font-weight:700;color:#ffffff;">Mission Control</div>
                  <div style="font-size:11px;color:#6b7280;letter-spacing:0.1em;text-transform:uppercase;">Koch Aufforstung GmbH</div>
                </div>
              </div>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Guten Morgen, ${username}! 👋</h1>
              <p style="margin:0;font-size:13px;color:#6b7280;">${today}</p>
            </td>
          </tr>

          <!-- Zusammenfassung -->
          <tr>
            <td style="background:#111111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:24px 40px;">
              <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Zusammenfassung</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center;">
                    <div style="background:#0f2010;border:1px solid #1a4a1a;border-radius:12px;padding:16px 8px;">
                      <div style="font-size:28px;font-weight:700;color:#10b981;">${neueAufgaben}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">neue Aufgaben</div>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;">
                    <div style="background:#1f0e0e;border:1px solid #4a1a1a;border-radius:12px;padding:16px 8px;">
                      <div style="font-size:28px;font-weight:700;color:#ef4444;">${faelligeAufgaben}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">fällige Aufgaben</div>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;">
                    <div style="background:#0e0e1f;border:1px solid #1a1a4a;border-radius:12px;padding:16px 8px;">
                      <div style="font-size:28px;font-weight:700;color:#6366f1;">${neueKommentare}</div>
                      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Kommentare</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Benachrichtigungen -->
          <tr>
            <td style="background:#0f0f0f;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;border-top:1px solid #1e1e1e;padding:24px 40px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">
                Ungelesene Benachrichtigungen
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#4b5563;">${notifications.length} Benachrichtigungen warten auf dich</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${notifications.length > 0 ? notifSektionen : `
                <tr>
                  <td style="padding:20px 0;text-align:center;color:#4b5563;font-size:13px;">
                    Keine ungelesenen Benachrichtigungen 🎉
                  </td>
                </tr>`}
              </table>
              <div style="text-align:center;margin-top:24px;">
                <a href="${notificationsUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600;">
                  Alle Benachrichtigungen ansehen →
                </a>
              </div>
            </td>
          </tr>

          <!-- CTA Bereich -->
          <tr>
            <td style="background:#0a0a0a;border:1px solid #1e1e1e;border-top:none;padding:20px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <a href="${baseUrl}/tasks" style="display:inline-block;background:#1a1a1a;color:#d1d5db;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:12px;border:1px solid #2a2a2a;margin:0 4px;">
                      📋 Aufgaben
                    </a>
                    <a href="${baseUrl}/projects" style="display:inline-block;background:#1a1a1a;color:#d1d5db;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:12px;border:1px solid #2a2a2a;margin:0 4px;">
                      📁 Projekte
                    </a>
                    <a href="${baseUrl}/calendar" style="display:inline-block;background:#1a1a1a;color:#d1d5db;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:12px;border:1px solid #2a2a2a;margin:0 4px;">
                      📅 Kalender
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#060606;border:1px solid #161616;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#374151;">
                Du erhältst diese E-Mail, weil du den täglichen Digest aktiviert hast.
              </p>
              <p style="margin:0;font-size:11px;color:#374151;">
                <a href="${unsubscribeUrl}" style="color:#4b5563;text-decoration:underline;">
                  E-Mail-Digest abbestellen
                </a>
                &nbsp;·&nbsp;
                <a href="${baseUrl}/settings/notifications/digest-preview" style="color:#4b5563;text-decoration:underline;">
                  Digest-Vorschau
                </a>
                &nbsp;·&nbsp;
                <a href="${baseUrl}" style="color:#4b5563;text-decoration:underline;">
                  Mission Control öffnen
                </a>
              </p>
              <p style="margin:12px 0 0;font-size:10px;color:#1f2937;">
                © Koch Aufforstung GmbH · Mission Control
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmailDigests(
  digestMarkdown: string,
  notifByType: Record<string, number>,
  totalUnread: number
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    const usersWithUnread = await prisma.authUser.findMany({
      where: {
        notifEmailDigest: true,
        active: true,
        email: { not: null },
        notifications: { some: { read: false } },
      },
      include: {
        notifications: {
          where: { read: false },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://mission-control-tawny-omega.vercel.app";

    // Aufgaben-Statistiken aus notifByType ableiten
    const neueAufgaben = (notifByType["task_assigned"] ?? 0) + (notifByType["task_status_changed"] ?? 0) + (notifByType["task_update"] ?? 0);
    const faelligeAufgaben = (notifByType["deadline"] ?? 0) + (notifByType["milestone_due"] ?? 0);
    const neueKommentare = notifByType["comment_added"] ?? 0;

    for (const authUser of usersWithUnread) {
      if (!authUser.email) continue;

      const html = buildDigestEmailHtml({
        baseUrl,
        username: authUser.username,
        email: authUser.email,
        userId: authUser.id,
        notifications: authUser.notifications,
        neueAufgaben,
        faelligeAufgaben,
        neueKommentare,
      });

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Mission Control <noreply@koch-aufforstung.de>",
            to: [authUser.email],
            subject: `🌲 Mission Control Digest — ${authUser.notifications.length} ungelesene Benachrichtigungen`,
            html,
          }),
        });
      } catch (mailErr) {
        console.error("[digest] Email-Versand fehlgeschlagen für", authUser.email, mailErr);
      }
    }
  } catch (err) {
    console.error("[digest] sendEmailDigests Fehler:", err);
  }
}

// GET /api/digest/generate — Heutigen Digest abrufen
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const heute = startOfDay(new Date());
    const digest = await prisma.dailyDigest.findUnique({ where: { datum: heute } });

    if (!digest) {
      return NextResponse.json(
        { error: "Kein Digest für heute vorhanden. Bitte zuerst generieren." },
        { status: 404 }
      );
    }

    return NextResponse.json(digest);
  } catch (error) {
    console.error("[GET /api/digest/generate]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
