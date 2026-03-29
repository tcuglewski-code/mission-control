import { NextRequest, NextResponse } from "next/server";
import { logAiUsageFireAndForget } from "@/lib/ai-usage";

interface GeneratedTask {
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  storyPoints: number;
  category: string;
}

interface AIResponse {
  tasks: GeneratedTask[];
  totalStoryPoints: number;
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI nicht konfiguriert", configured: false },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { sprintName, sprintDescription, sprintGoal, projectName } = body;

    if (!sprintName) {
      return NextResponse.json(
        { error: "sprintName ist erforderlich" },
        { status: 400 }
      );
    }

    const userPrompt = `Sprint: "${sprintName}"
${sprintGoal ? `Sprint-Ziel: "${sprintGoal}"` : ""}
${sprintDescription ? `Beschreibung: "${sprintDescription}"` : ""}
${projectName ? `Projekt: "${projectName}"` : ""}

Generiere 5-10 konkrete, umsetzbare Tasks für diesen Sprint.`;

    const systemPrompt = `Du bist ein erfahrener Software-Projektmanager. Generiere konkrete, umsetzbare Tasks für einen Sprint.
Jeder Task soll: klar formuliert, einzeln umsetzbar und sinnvoll priorisiert sein.
Antworte NUR mit validem JSON ohne Markdown-Wrapper.
Generiere 5-10 Tasks pro Sprint.

Das JSON muss diesem Format entsprechen:
{
  "tasks": [
    {
      "title": "Task-Titel",
      "description": "Kurze Beschreibung was zu tun ist",
      "priority": "critical" | "high" | "medium" | "low",
      "storyPoints": 1-13,
      "category": "Frontend" | "Backend" | "Testing" | "DevOps" | "Design" | "Documentation"
    }
  ],
  "totalStoryPoints": Summe aller Story Points,
  "summary": "Kurze Zusammenfassung der generierten Tasks"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[AI Sprint Tasks] API error:", response.status, errorData);
      return NextResponse.json(
        { error: `AI API Fehler: ${response.status}` },
        { status: 500 }
      );
    }

    const message = await response.json();

    // Extrahiere Text aus der Antwort
    const textBlock = message.content?.find((block: { type: string }) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Keine Textantwort von AI" },
        { status: 500 }
      );
    }

    let rawText = textBlock.text.trim();
    
    // Entferne mögliche Markdown-Wrapper
    if (rawText.startsWith("```json")) {
      rawText = rawText.slice(7);
    } else if (rawText.startsWith("```")) {
      rawText = rawText.slice(3);
    }
    if (rawText.endsWith("```")) {
      rawText = rawText.slice(0, -3);
    }
    rawText = rawText.trim();

    // Parse JSON
    let parsed: AIResponse;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      console.error("[AI Sprint Tasks] JSON parse error:", parseError, "Raw:", rawText);
      return NextResponse.json(
        { error: "AI-Antwort konnte nicht geparst werden" },
        { status: 500 }
      );
    }

    // Validiere Struktur
    if (!Array.isArray(parsed.tasks)) {
      return NextResponse.json(
        { error: "Ungültiges AI-Antwortformat" },
        { status: 500 }
      );
    }

    // Berechne totalStoryPoints falls nicht vorhanden
    if (typeof parsed.totalStoryPoints !== "number") {
      parsed.totalStoryPoints = parsed.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    }

    // Token-Usage loggen (fire-and-forget)
    logAiUsageFireAndForget({
      source: "api",
      feature: "sprint-tasks",
      model: "claude-3-5-haiku-20241022",
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      sprintId: body.sprintId,
      projectId: body.projectId,
    });

    return NextResponse.json({
      tasks: parsed.tasks,
      totalStoryPoints: parsed.totalStoryPoints,
      summary: parsed.summary || `${parsed.tasks.length} Tasks generiert`,
    });
  } catch (error) {
    console.error("[POST /api/ai/sprint-tasks]", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
