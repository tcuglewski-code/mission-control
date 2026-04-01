import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * POST /api/cron/seo-article-generator
 * Vercel Cron: monatlich am 15. um 10:00 UTC
 * 
 * Quill v2: Automatische SEO-Artikel-Generierung
 * 1. Perplexity Research zu aktuellen Branchen-Themen
 * 2. Anthropic Haiku generiert SEO-optimierten Artikel
 * 3. Artikel als Draft in MC-Docs + Review-Task für Tomek
 */

interface PerplexityResult {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

interface ArticleTopic {
  title: string;
  angle: string;
  keywords: string[];
  sources: string[];
}

// Themen-Kategorien für Feldhub-Zielgruppen
const TOPIC_CATEGORIES = [
  {
    category: "Forstwirtschaft",
    queries: [
      "Forstwirtschaft Digitalisierung Trends 2026 Deutschland",
      "Fördermittel Waldbesitzer aktuell 2026",
      "Klimawandelangepasste Baumarten Empfehlungen 2026",
      "Forstbetrieb Software Außendienst",
    ],
  },
  {
    category: "Außendienst KMU",
    queries: [
      "Field Service Management KMU Trends 2026",
      "Mobile Zeiterfassung Außendienst Vorteile",
      "Digitalisierung Handwerk Baustelle 2026",
      "Offline-fähige Apps Außendienst",
    ],
  },
  {
    category: "Landschaftsbau",
    queries: [
      "Landschaftsbau Digitalisierung Software 2026",
      "GaLaBau Betrieb Mitarbeiter App",
      "Grünflächenpflege Software Trends",
    ],
  },
];

async function searchPerplexity(query: string, apiKey: string): Promise<PerplexityResult | null> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: `Du bist ein Research-Agent für SEO-Artikel. 
Analysiere die Suchergebnisse und extrahiere:
1. Ein spezifisches Artikel-Thema (nicht zu breit)
2. Einen interessanten Blickwinkel/Hook
3. 3-5 relevante Keywords für SEO
4. Quellen-URLs

Antworte als JSON:
{
  "title": "Präziser Artikel-Titel (max 60 Zeichen)",
  "angle": "Interessanter Blickwinkel für den Artikel",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sources": ["url1", "url2"]
}

Antworte NUR mit dem JSON, kein anderer Text.`,
          },
          {
            role: "user",
            content: `Recherchiere: ${query}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      console.error(`[seo-generator] Perplexity error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[seo-generator] Perplexity fetch error:", error);
    return null;
  }
}

function parseTopicFromResponse(content: string): ArticleTopic | null {
  try {
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
    cleanContent = cleanContent.trim();

    const topic = JSON.parse(cleanContent);
    if (!topic.title || !topic.angle) return null;
    return topic as ArticleTopic;
  } catch (error) {
    console.error("[seo-generator] Failed to parse topic:", error);
    return null;
  }
}

async function generateArticle(
  topic: ArticleTopic,
  anthropicKey: string
): Promise<string | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content: `Schreibe einen SEO-optimierten Blog-Artikel auf Deutsch.

**Thema:** ${topic.title}
**Blickwinkel:** ${topic.angle}
**Keywords (natürlich einbauen):** ${topic.keywords.join(", ")}
**Quellen zur Referenz:** ${topic.sources.join(", ")}

**Anforderungen:**
- Länge: 700-900 Wörter
- Zielgruppe: KMU-Inhaber, Entscheider im Außendienst
- Ton: Professionell, informativ, nicht werblich
- Struktur: H1 (Titel), Einleitung (2-3 Sätze), H2-Abschnitte, Fazit
- SEO: Keywords im Titel, ersten Absatz, H2s und Fazit
- Meta-Description (max 155 Zeichen) am Ende als Kommentar

**Format:** Markdown mit H1 als Titel

Schreibe jetzt den Artikel:`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[seo-generator] Anthropic error: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch (error) {
    console.error("[seo-generator] Anthropic fetch error:", error);
    return null;
  }
}

async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("[seo-generator] Telegram failed:", error);
  }
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!perplexityKey) {
    console.error("[seo-generator] PERPLEXITY_API_KEY not configured");
    return NextResponse.json({ error: "Perplexity API not configured" }, { status: 500 });
  }

  if (!anthropicKey) {
    console.error("[seo-generator] ANTHROPIC_API_KEY not configured");
    return NextResponse.json({ error: "Anthropic API not configured" }, { status: 500 });
  }

  try {
    // 1. Wähle zufällige Kategorie und Query
    const categoryIndex = Math.floor(Math.random() * TOPIC_CATEGORIES.length);
    const category = TOPIC_CATEGORIES[categoryIndex];
    const queryIndex = Math.floor(Math.random() * category.queries.length);
    const query = category.queries[queryIndex];

    console.log(`[seo-generator] Research: ${category.category} - "${query}"`);

    // 2. Perplexity Research
    const researchResult = await searchPerplexity(query, perplexityKey);
    if (!researchResult?.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: "Research failed" }, { status: 500 });
    }

    const topic = parseTopicFromResponse(researchResult.choices[0].message.content);
    if (!topic) {
      return NextResponse.json({ error: "Topic parsing failed" }, { status: 500 });
    }

    console.log(`[seo-generator] Topic: "${topic.title}"`);

    // 3. Artikel generieren mit Haiku
    const article = await generateArticle(topic, anthropicKey);
    if (!article) {
      return NextResponse.json({ error: "Article generation failed" }, { status: 500 });
    }

    console.log(`[seo-generator] Article generated: ${article.length} chars`);

    // 4. Als MC-Document speichern (Draft)
    const doc = await prisma.document.create({
      data: {
        title: `[DRAFT] ${topic.title}`,
        content: `---
status: draft
category: ${category.category}
keywords: ${topic.keywords.join(", ")}
sources: ${topic.sources.join(", ")}
generated: ${new Date().toISOString()}
---

${article}

---
_Generiert von Quill v2 SEO-Agent. Review erforderlich vor Veröffentlichung._`,
        type: "article",
      },
    });

    // 5. Review-Task für Tomek erstellen
    const project = await prisma.project.findFirst({
      where: { name: { contains: "ForstManager" } },
    });

    const task = await prisma.task.create({
      data: {
        title: `✍️ SEO-Artikel Review: ${topic.title}`,
        description: `**Quill v2 hat einen neuen SEO-Artikel generiert.**

📄 [Dokument öffnen](/docs/${doc.id})

**Kategorie:** ${category.category}
**Keywords:** ${topic.keywords.join(", ")}

**Nächste Schritte:**
1. Artikel im Dokument lesen
2. Fakten prüfen (Quellen: ${topic.sources.join(", ")})
3. Anpassungen vornehmen falls nötig
4. In WordPress als Draft anlegen
5. Veröffentlichen

_Generiert: ${new Date().toLocaleDateString("de-DE")}_`,
        status: "backlog",
        priority: "low",
        labels: ["content", "seo", "review", "quill"],
        projectId: project?.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 Tage
      },
    });

    // 6. Activity Log
    await prisma.activityLog.create({
      data: {
        action: "SEO_ARTICLE_GENERATED",
        entityType: "document",
        entityId: doc.id,
        entityName: topic.title,
        details: {
          category: category.category,
          keywords: topic.keywords,
          sources: topic.sources,
          articleLength: article.length,
          taskId: task.id,
        },
      },
    });

    // 7. Telegram-Benachrichtigung
    await sendTelegramAlert(
      `✍️ *Quill v2: Neuer SEO-Artikel generiert*\n\n` +
        `📝 "${topic.title}"\n` +
        `🏷️ ${category.category}\n` +
        `🔑 ${topic.keywords.slice(0, 3).join(", ")}\n\n` +
        `➡️ [Review-Task öffnen](${process.env.NEXTAUTH_URL || "https://mission-control-tawny-omega.vercel.app"}/tasks)`
    );

    return NextResponse.json({
      success: true,
      topic: {
        title: topic.title,
        category: category.category,
        keywords: topic.keywords,
      },
      document: {
        id: doc.id,
        title: doc.title,
      },
      task: {
        id: task.id,
        title: task.title,
      },
      articleLength: article.length,
    });
  } catch (error) {
    console.error("[seo-generator] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req);
}
