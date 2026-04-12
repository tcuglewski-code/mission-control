/**
 * Research News Cron Route (AF055)
 * 
 * Läuft jeden Montag 09:00 Uhr via Vercel Cron.
 * Sucht via Perplexity API nach aktuellen Branchennews.
 * Erstellt MC-Task mit Zusammenfassung + Telegram-Report.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

// Feldhub Zielbranchen für die Suche
const TARGET_INDUSTRIES = [
  "Forstbetriebe und Forstwirtschaft",
  "Landschaftsbau und Gartenbau",
  "Tiefbau und Bauunternehmen",
  "Gebäudereinigung und Facility Management",
  "Landwirtschaft und Agrarbetriebe",
];

// Telegram Alert senden
async function sendTelegramReport(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Research] Telegram nicht konfiguriert");
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
    console.error("[Research] Telegram-Fehler:", err);
    return false;
  }
}

// Perplexity API aufrufen
async function searchPerplexity(query: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.error("[Research] PERPLEXITY_API_KEY nicht konfiguriert");
    return null;
  }

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "Du bist ein Branchenanalyst. Fasse die wichtigsten News der letzten Woche prägnant zusammen. Fokus auf: Digitalisierung, Software-Trends, Gesetzesänderungen, Förderprogramme. Antwort auf Deutsch, max. 500 Wörter.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Research] Perplexity API Fehler:", res.status, errorText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[Research] Perplexity Fehler:", err);
    return null;
  }
}

// MC Task erstellen
async function createResearchTask(content: string, industries: string[]): Promise<string | null> {
  try {
    // Feldhub-Projekt finden oder "General"
    let project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: "Feldhub", mode: "insensitive" } },
          { name: { contains: "App-Fabrik", mode: "insensitive" } },
          { name: { contains: "Research", mode: "insensitive" } },
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
      console.warn("[Research] Kein Projekt gefunden für Task");
      return null;
    }

    const today = new Date().toLocaleDateString("de-DE", { 
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });

    const task = await prisma.task.create({
      data: {
        title: `📰 Branchennews KW${getWeekNumber(new Date())} — ${today}`,
        description: `## Wöchentlicher Branchen-Report\n\n**Analysierte Branchen:**\n${industries.map(i => `- ${i}`).join("\n")}\n\n---\n\n${content}`,
        status: "backlog",
        priority: "low",
        projectId: project.id,
        tags: ["research", "branchennews", "auto-generated"],
      },
    });

    console.log(`[Research] Task erstellt: ${task.id}`);
    return task.id;
  } catch (err) {
    console.error("[Research] Task-Erstellung fehlgeschlagen:", err);
    return null;
  }
}

// Kalenderwoche berechnen
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(request: NextRequest) {
  // Auth prüfen
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{ industry: string; success: boolean; summary?: string }> = [];

  try {
    // Gesamte Suche in einem API-Call (effizienter)
    const combinedQuery = `
      Aktuelle News und Entwicklungen der letzten 7 Tage in Deutschland für diese Branchen:
      ${TARGET_INDUSTRIES.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}
      
      Fokus auf:
      - Neue Software-Lösungen und Digitalisierung
      - Gesetzliche Änderungen und Regulierungen
      - Förderprogramme und Subventionen
      - Markttrends und Wachstum
      - Relevante Events und Messen
    `;

    const searchResult = await searchPerplexity(combinedQuery);

    if (!searchResult) {
      return NextResponse.json({
        success: false,
        error: "Perplexity API nicht verfügbar oder konfiguriert",
        duration: Date.now() - startTime,
      }, { status: 503 });
    }

    // Task erstellen
    const taskId = await createResearchTask(searchResult, TARGET_INDUSTRIES);

    // Telegram-Report (gekürzt)
    const telegramText = `📰 <b>Wöchentlicher Branchen-Report</b>\n\n` +
      `<b>KW${getWeekNumber(new Date())}</b> — ${new Date().toLocaleDateString("de-DE")}\n\n` +
      `${searchResult.slice(0, 800)}${searchResult.length > 800 ? "..." : ""}\n\n` +
      `${taskId ? `📋 Task: ${taskId}` : "⚠️ Task konnte nicht erstellt werden"}\n` +
      `<i>Vollständiger Report in Mission Control</i>`;

    const telegramSent = await sendTelegramReport(telegramText);

    // Log in ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "RESEARCH_NEWS_GENERATED",
        entityType: "task",
        entityId: taskId ?? "none",
        details: {
          industries: TARGET_INDUSTRIES,
          contentLength: searchResult.length,
          telegramSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      weekNumber: getWeekNumber(new Date()),
      taskId,
      telegramSent,
      contentLength: searchResult.length,
      duration: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error("[Research News Cron] Fehler:", err);
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
