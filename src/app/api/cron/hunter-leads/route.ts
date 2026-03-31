import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/hunter-leads
 * Vercel Cron: wöchentlich Montag 09:00 UTC
 * 
 * Hunter-Agent: Automatische Lead-Recherche via Perplexity API
 * Sucht nach KMU im Außendienst die Software suchen und erstellt Deals in der Sales-Pipeline
 */

interface PerplexityResult {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

interface ParsedLead {
  company: string;
  industry: string;
  description: string;
  source?: string;
  contactInfo?: string;
}

const SEARCH_QUERIES = [
  "Forstbetrieb Deutschland sucht Software Digitalisierung 2026",
  "Landschaftsbau Unternehmen App Außendienst gesucht",
  "Gartenbau Betrieb Mitarbeiter App Zeiterfassung",
  "Tiefbau KMU Baustellen-Software gesucht",
  "Reinigungsfirma Außendienst Disposition Software",
];

async function searchPerplexity(query: string, apiKey: string): Promise<PerplexityResult | null> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: `Du bist ein Lead-Research-Agent. Finde Unternehmen die Software für den Außendienst suchen.
Antworte IMMER als JSON-Array mit folgender Struktur:
[
  {
    "company": "Firmenname",
    "industry": "Branche (Forst/Landschaftsbau/Tiefbau/Reinigung/Gartenbau)",
    "description": "Kurze Beschreibung was sie suchen",
    "source": "URL der Quelle falls bekannt",
    "contactInfo": "Kontaktdaten falls verfügbar"
  }
]
Falls keine passenden Ergebnisse: antworte mit leerem Array []
Antworte NUR mit dem JSON-Array, kein anderer Text.`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[hunter-leads] Perplexity API error: ${response.status}`, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[hunter-leads] Perplexity fetch error:", error);
    return null;
  }
}

function parseLeadsFromResponse(content: string): ParsedLead[] {
  try {
    // Clean up markdown formatting if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const leads = JSON.parse(cleanContent);
    if (!Array.isArray(leads)) {
      console.warn("[hunter-leads] Response is not an array");
      return [];
    }
    return leads.filter(
      (lead) => lead.company && typeof lead.company === "string"
    );
  } catch (error) {
    console.error("[hunter-leads] Failed to parse leads:", error);
    console.log("[hunter-leads] Raw content:", content.substring(0, 500));
    return [];
  }
}

async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[hunter-leads] Telegram not configured, skipping alert");
    return;
  }

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
    console.error("[hunter-leads] Telegram alert failed:", error);
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    console.error("[hunter-leads] PERPLEXITY_API_KEY not configured");
    return NextResponse.json(
      { error: "Perplexity API key not configured" },
      { status: 500 }
    );
  }

  try {
    const allLeads: ParsedLead[] = [];
    const searchResults: Record<string, number> = {};

    // Run searches (limit to 2 per run to avoid rate limits)
    const queriesToRun = SEARCH_QUERIES.slice(0, 2);
    
    for (const query of queriesToRun) {
      console.log(`[hunter-leads] Searching: ${query.substring(0, 50)}...`);
      
      const result = await searchPerplexity(query, perplexityKey);
      if (result?.choices?.[0]?.message?.content) {
        const leads = parseLeadsFromResponse(result.choices[0].message.content);
        searchResults[query.substring(0, 30)] = leads.length;
        allLeads.push(...leads);
      }
      
      // Rate limit: wait 1s between queries
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Deduplicate by company name (case-insensitive)
    const seenCompanies = new Set<string>();
    const uniqueLeads = allLeads.filter((lead) => {
      const key = lead.company.toLowerCase().trim();
      if (seenCompanies.has(key)) return false;
      seenCompanies.add(key);
      return true;
    });

    // Check which companies already exist in deals
    const existingDeals = await prisma.deal.findMany({
      select: { company: true },
    });
    const existingCompanies = new Set(
      existingDeals.map((d) => d.company.toLowerCase().trim())
    );

    const newLeads = uniqueLeads.filter(
      (lead) => !existingCompanies.has(lead.company.toLowerCase().trim())
    );

    // Create deals for new leads
    const createdDeals = [];
    for (const lead of newLeads.slice(0, 5)) { // Max 5 new deals per run
      try {
        const deal = await prisma.deal.create({
          data: {
            title: `Lead: ${lead.company}`,
            company: lead.company,
            stage: "prospect",
            probability: 5,
            value: 0,
            source: "Hunter-Agent (Perplexity)",
            notes: [
              `**Branche:** ${lead.industry || "Unbekannt"}`,
              `**Beschreibung:** ${lead.description || "-"}`,
              lead.source ? `**Quelle:** ${lead.source}` : null,
              lead.contactInfo ? `**Kontakt:** ${lead.contactInfo}` : null,
              `\n_Automatisch gefunden am ${new Date().toLocaleDateString("de-DE")}_`,
            ]
              .filter(Boolean)
              .join("\n"),
            industry: lead.industry || "Sonstige",
          },
        });

        // Create activity log for deal
        await prisma.dealActivity.create({
          data: {
            dealId: deal.id,
            type: "note",
            content: "Lead automatisch via Hunter-Agent gefunden",
            authorName: "Hunter-Agent",
          },
        });

        createdDeals.push(deal);
      } catch (error) {
        console.error(`[hunter-leads] Failed to create deal for ${lead.company}:`, error);
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "HUNTER_LEADS_SCAN",
        entityType: "system",
        entityId: "hunter-agent",
        entityName: "Hunter-Agent Lead Scan",
        details: {
          queriesRun: queriesToRun.length,
          totalFound: allLeads.length,
          unique: uniqueLeads.length,
          new: newLeads.length,
          created: createdDeals.length,
          searchResults,
        },
      },
    });

    // Send Telegram alert if new leads found
    if (createdDeals.length > 0) {
      const leadList = createdDeals
        .map((d) => `• ${d.company}`)
        .join("\n");
      
      await sendTelegramAlert(
        `🎯 *Hunter-Agent: ${createdDeals.length} neue Leads gefunden!*\n\n${leadList}\n\n➡️ [Sales Pipeline öffnen](${process.env.NEXTAUTH_URL || "https://mission-control-tawny-omega.vercel.app"}/deals)`
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        queriesRun: queriesToRun.length,
        totalFound: allLeads.length,
        uniqueLeads: uniqueLeads.length,
        newLeads: newLeads.length,
        dealsCreated: createdDeals.length,
      },
      createdDeals: createdDeals.map((d) => ({
        id: d.id,
        company: d.company,
        industry: d.industry,
      })),
    });
  } catch (error) {
    console.error("[hunter-leads] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req);
}
