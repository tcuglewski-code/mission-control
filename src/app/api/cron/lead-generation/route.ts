/**
 * Magnet-Agent: Lead Generation Monitoring (AF084)
 * 
 * Läuft jeden Mittwoch 10:00 Uhr via Vercel Cron.
 * Sucht via Perplexity API nach Unternehmen die Software/Digitalisierung suchen.
 * Erstellt MC-Tasks in der Sales-Pipeline für interessante Leads.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

const SALES_PROJECT_NAME = "AppFabrik Sales Pipeline";

// Suchkategorien für Lead-Generation
const SEARCH_CATEGORIES = [
  {
    name: "Forstbetriebe",
    keywords: [
      "Forstbetrieb sucht Software",
      "Forstwirtschaft Digitalisierung",
      "Waldbewirtschaftung App",
      "Forstunternehmen Zeiterfassung",
    ],
  },
  {
    name: "Landschaftsbau",
    keywords: [
      "Landschaftsbau Software gesucht",
      "Gartenbau Digitalisierung",
      "Landschaftsgärtner App Aufträge",
      "GaLaBau Zeiterfassung",
    ],
  },
  {
    name: "Tiefbau & Bau",
    keywords: [
      "Tiefbau Unternehmen sucht Software",
      "Bauunternehmen Digitalisierung",
      "Baustellen App klein mittel",
      "Handwerk Außendienst Software",
    ],
  },
  {
    name: "Gebäudereinigung",
    keywords: [
      "Reinigungsfirma sucht Software",
      "Facility Management Digitalisierung KMU",
      "Gebäudereinigung Auftragsverwaltung",
      "Reinigung Zeiterfassung App",
    ],
  },
];

// Suchquellen
const SEARCH_SOURCES = [
  "LinkedIn Posts",
  "XING Gruppen",
  "Branchenforen",
  "Google News",
  "Firmen-Websites mit Stellenanzeigen",
];

// Telegram Alert senden
async function sendTelegramAlert(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Magnet] Telegram nicht konfiguriert");
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
    console.error("[Magnet] Telegram-Fehler:", err);
    return false;
  }
}

// Perplexity API aufrufen
async function searchPerplexity(query: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.error("[Magnet] PERPLEXITY_API_KEY nicht konfiguriert");
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
            content: `Du bist ein Lead-Research-Spezialist für B2B-Software im Außendienst-Bereich.

Deine Aufgabe: Finde konkrete Hinweise auf Unternehmen, die nach Software-Lösungen suchen.

Strukturiere deine Antwort so:

## Potenzielle Leads

Für jeden gefundenen Hinweis:
- **Unternehmen/Quelle:** Name oder Beschreibung
- **Branche:** Kategorie
- **Signal:** Was deutet auf Interesse hin? (Forum-Post, Stellenanzeige, News)
- **Kontakt:** Wenn vorhanden (Website, Name)
- **Relevanz:** Hoch/Mittel/Niedrig

## Zusammenfassung

Kurze Einschätzung der Marktlage.

Antworte auf Deutsch. Konzentriere dich auf D-A-CH Region.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Magnet] Perplexity API Fehler:", res.status, errorText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[Magnet] Perplexity Fehler:", err);
    return null;
  }
}

// Lead-Task erstellen
async function createLeadTask(content: string, category: string): Promise<string | null> {
  try {
    // Sales-Projekt finden oder erstellen
    let salesProject = await prisma.project.findFirst({
      where: { name: SALES_PROJECT_NAME },
    });

    if (!salesProject) {
      salesProject = await prisma.project.create({
        data: {
          name: SALES_PROJECT_NAME,
          description: "AppFabrik Lead-Tracking und Sales-Pipeline",
          status: "active",
          priority: "high",
          color: "#22c55e",
        },
      });
    }

    const today = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const task = await prisma.task.create({
      data: {
        title: `🧲 Lead-Research: ${category} — ${today}`,
        description: `## Magnet-Agent Lead-Scan

**Kategorie:** ${category}
**Scan-Datum:** ${today}
**Quellen:** ${SEARCH_SOURCES.join(", ")}

---

${content}

---

### Nächste Schritte

- [ ] Leads bewerten und priorisieren
- [ ] Vielversprechende Kontakte recherchieren
- [ ] Erstansprache vorbereiten
- [ ] In Sales-Pipeline einordnen`,
        status: "todo",
        priority: "medium",
        labels: "lead-research,magnet-agent,auto-generated",
        projectId: salesProject.id,
      },
    });

    console.log(`[Magnet] Task erstellt: ${task.id}`);
    return task.id;
  } catch (err) {
    console.error("[Magnet] Task-Erstellung fehlgeschlagen:", err);
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
  const results: Array<{ category: string; taskId: string | null; success: boolean }> = [];

  try {
    // Kombinierte Suche für alle Kategorien (effizienter als einzelne Calls)
    const combinedQuery = `
Suche nach aktuellen Hinweisen (letzte 2 Wochen) auf Unternehmen in Deutschland, Österreich oder der Schweiz, die nach Software-Lösungen für den Außendienst suchen.

Fokus auf diese Branchen und Signale:

${SEARCH_CATEGORIES.map((cat, idx) => `
**${idx + 1}. ${cat.name}:**
${cat.keywords.map(k => `- "${k}"`).join("\n")}
`).join("\n")}

Suche in:
${SEARCH_SOURCES.map(s => `- ${s}`).join("\n")}

Achte besonders auf:
- LinkedIn/XING Posts von Unternehmern die nach Lösungen fragen
- Forum-Diskussionen über Digitalisierung
- Stellenanzeigen für "Digitalisierung" oder "IT-Projektleiter"
- Pressemitteilungen über Wachstum/Expansion
- Ausschreibungen von KMU
    `.trim();

    const searchResult = await searchPerplexity(combinedQuery);

    if (!searchResult) {
      return NextResponse.json({
        success: false,
        error: "Perplexity API nicht verfügbar oder konfiguriert",
        duration: Date.now() - startTime,
      }, { status: 503 });
    }

    // Einen zusammenfassenden Task erstellen
    const taskId = await createLeadTask(searchResult, "Alle Branchen");
    results.push({ category: "combined", taskId, success: !!taskId });

    // Telegram-Alert (gekürzt)
    const weekNum = getWeekNumber(new Date());
    const leadsFound = (searchResult.match(/\*\*Unternehmen\/Quelle:/g) || []).length;

    const telegramText = `🧲 <b>Magnet-Agent Lead-Scan KW${weekNum}</b>\n\n` +
      `<b>Branchen:</b> ${SEARCH_CATEGORIES.map(c => c.name).join(", ")}\n` +
      `<b>Potenzielle Leads gefunden:</b> ~${leadsFound}\n\n` +
      `${searchResult.slice(0, 600)}${searchResult.length > 600 ? "..." : ""}\n\n` +
      `${taskId ? `📋 <b>Task:</b> ${taskId}` : "⚠️ Task konnte nicht erstellt werden"}\n` +
      `<i>Vollständiger Report in Mission Control → Sales Pipeline</i>`;

    const telegramSent = await sendTelegramAlert(telegramText);

    // Log in ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "LEAD_GENERATION_SCAN",
        entityType: "task",
        entityId: taskId ?? "none",
        details: {
          categories: SEARCH_CATEGORIES.map(c => c.name),
          leadsFound,
          contentLength: searchResult.length,
          telegramSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      weekNumber: weekNum,
      results,
      leadsFound,
      telegramSent,
      duration: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error("[Magnet Lead-Gen Cron] Fehler:", err);
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
