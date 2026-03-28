import { NextRequest, NextResponse } from "next/server";
import { isAiAvailable } from "@/lib/ai";

const MODEL = "claude-3-5-haiku-20241022";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `Du bist ein erfahrener Software-Architekt der AppFabrik. Du schätzt Story Points für Softwareprojekte.
Referenz-Benchmarks:
- Auth + Grundgerüst: 50-80 SP
- Einfaches CRUD-Modul: 30-50 SP
- Komplexes Modul (GPS, Offline, Kamera): 80-150 SP
- Backend API + DB: 60-100 SP
- Mobile App komplett: 800-1.500 SP
- Web App komplett: 400-800 SP

Antworte NUR mit validem JSON, ohne Markdown-Wrapper.`;

interface EstimateInput {
  description: string;
  projectType?: string;
  hasOffline?: boolean;
  hasMobile?: boolean;
  hasBackend?: boolean;
  referenceProject?: string;
}

interface ModuleEstimate {
  name: string;
  description: string;
  features: string[];
  storyPoints: number;
  complexity: "low" | "medium" | "high";
}

interface EstimateOutput {
  modules: ModuleEstimate[];
  totalStoryPoints: number;
  timeEstimate: {
    withAmadeus: string;
    classicTeam: string;
  };
  notes: string;
  model: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAiAvailable()) {
      return NextResponse.json(
        { error: "KI nicht verfügbar", kiAvailable: false },
        { status: 503 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "KI nicht verfügbar", kiAvailable: false },
        { status: 503 }
      );
    }

    const body: EstimateInput = await req.json();
    const { description, projectType, hasOffline, hasMobile, hasBackend, referenceProject } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Beschreibung zu kurz (min. 10 Zeichen)" },
        { status: 400 }
      );
    }

    const userPrompt = `Schätze Story Points für dieses Projekt:

Beschreibung: ${description}
Typ: ${projectType ?? "nicht angegeben"}
Offline: ${hasOffline ? "Ja" : "Nein"}
Mobile: ${hasMobile ? "Ja" : "Nein"}
Backend: ${hasBackend ? "Ja" : "Nein"}
${referenceProject ? `Referenzprojekt: ${referenceProject}` : ""}

Erstelle eine detaillierte Modul-Aufschlüsselung als JSON mit modules[], totalStoryPoints, timeEstimate und notes.
Nutze die Fibonacci-Skala (1,2,3,5,8,13,21,34,55,89) für einzelne Features.
Summiere zu realistischen Modul-Totals.

Antworte mit genau diesem JSON-Format:
{
  "modules": [
    {
      "name": "Modulname",
      "description": "Kurze Beschreibung",
      "features": ["Feature 1", "Feature 2"],
      "storyPoints": 100,
      "complexity": "medium"
    }
  ],
  "totalStoryPoints": 500,
  "timeEstimate": {
    "withAmadeus": "2-3 Wochen",
    "classicTeam": "4-6 Monate"
  },
  "notes": "Wichtige Hinweise und Risiken"
}`;

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[project-estimate] Anthropic error:", res.status, err);
      return NextResponse.json(
        { error: "KI-Fehler", details: err },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText: string = data.content?.[0]?.text ?? "";

    // JSON parsen (ggf. aus Markdown extrahieren)
    let parsedResult: EstimateOutput;
    try {
      // Versuche direkt zu parsen
      let jsonText = rawText.trim();
      
      // Falls in Markdown-Codeblock: extrahieren
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonText);
      
      // Validierung der Struktur
      if (!Array.isArray(parsed.modules)) {
        throw new Error("modules ist kein Array");
      }
      if (typeof parsed.totalStoryPoints !== "number") {
        throw new Error("totalStoryPoints fehlt oder ungültig");
      }

      parsedResult = {
        modules: parsed.modules.map((m: any) => ({
          name: String(m.name ?? "Unbenanntes Modul"),
          description: String(m.description ?? ""),
          features: Array.isArray(m.features) ? m.features.map(String) : [],
          storyPoints: Number(m.storyPoints) || 0,
          complexity: ["low", "medium", "high"].includes(m.complexity) ? m.complexity : "medium",
        })),
        totalStoryPoints: Number(parsed.totalStoryPoints) || 0,
        timeEstimate: {
          withAmadeus: String(parsed.timeEstimate?.withAmadeus ?? "Unbekannt"),
          classicTeam: String(parsed.timeEstimate?.classicTeam ?? "Unbekannt"),
        },
        notes: String(parsed.notes ?? ""),
        model: MODEL,
      };
    } catch (parseError: any) {
      console.error("[project-estimate] JSON parse error:", parseError, rawText);
      return NextResponse.json(
        { 
          error: "KI-Antwort konnte nicht geparst werden",
          rawResponse: rawText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...parsedResult,
      kiAvailable: true,
    });
  } catch (error: any) {
    console.error("[POST /api/ai/project-estimate]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
