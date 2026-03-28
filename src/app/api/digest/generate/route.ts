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
async function sendEmailDigests(
  digestMarkdown: string,
  notifByType: Record<string, number>,
  totalUnread: number
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return; // Kein Email-Dienst konfiguriert

  try {
    // Benutzer mit aktiviertem Email-Digest und ungelesenen Notifications
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

    for (const authUser of usersWithUnread) {
      if (!authUser.email) continue;

      // Notifications nach Typ gruppieren
      const grouped: Record<string, typeof authUser.notifications> = {};
      for (const n of authUser.notifications) {
        if (!grouped[n.type]) grouped[n.type] = [];
        grouped[n.type].push(n);
      }

      const typeLabels: Record<string, string> = {
        task_assigned: "📋 Task-Zuweisungen",
        task_status_changed: "🔄 Status-Änderungen",
        comment_added: "💬 Neue Kommentare",
        milestone_due: "🏁 Fällige Meilensteine",
        sprint_completed: "✅ Abgeschlossene Sprints",
        mention: "@ Erwähnungen",
      };

      const notifHtml = Object.entries(grouped)
        .map(([type, notifs]) => {
          const label = typeLabels[type] ?? type;
          const items = notifs
            .map(
              (n) =>
                `<li style="margin-bottom:4px;"><strong>${n.title}</strong> — ${n.message}</li>`
            )
            .join("");
          return `<h3 style="margin:16px 0 8px;font-size:14px;">${label}</h3><ul style="margin:0;padding-left:20px;">${items}</ul>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Mission Control Digest</title></head>
<body style="font-family:sans-serif;background:#111;color:#eee;padding:32px;max-width:600px;margin:0 auto;">
  <h1 style="color:#10b981;margin-bottom:4px;">Mission Control</h1>
  <p style="color:#888;margin-bottom:24px;">Tagesdigest — Koch Aufforstung GmbH</p>

  <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;">
    <h2 style="margin-top:0;font-size:16px;">🔔 Deine ungelesenen Benachrichtigungen (${authUser.notifications.length})</h2>
    ${notifHtml}
    <p style="margin-top:16px;">
      <a href="${baseUrl}" style="background:#10b981;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">
        Alle anzeigen
      </a>
    </p>
  </div>

  <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;">
    <h2 style="margin-top:0;font-size:16px;">📊 Tagesdigest</h2>
    <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:13px;color:#ccc;">${digestMarkdown.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</pre>
  </div>

  <p style="color:#555;font-size:12px;text-align:center;">
    <a href="${baseUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(authUser.email)}&token=${Buffer.from(authUser.id).toString("base64")}" style="color:#555;">
      Email-Digest abbestellen
    </a>
  </p>
</body>
</html>`;

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
            subject: `Mission Control Digest — ${authUser.notifications.length} ungelesene Benachrichtigungen`,
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
