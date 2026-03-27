import { NextRequest, NextResponse } from "next/server";
import { getSessionOrApiKey } from "@/lib/api-auth";

// KI-Task-Vorschläge und Priorisierung
// Nutzt Anthropic Claude (ANTHROPIC_API_KEY) oder OpenAI (OPENAI_API_KEY)

interface TaskVorschlag {
  titel: string;
  beschreibung: string;
  prioritaet: "low" | "medium" | "high" | "urgent";
}

interface PriorisierungErgebnis {
  taskId: string;
  empfohlene_prioritaet: "low" | "medium" | "high" | "urgent";
  begruendung: string;
}

async function kiAnfrage(prompt: string): Promise<string> {
  // Versuche Anthropic API zuerst
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
        max_tokens: 1024,
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
        max_tokens: 1024,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
  }

  throw new Error("Kein KI-API-Key konfiguriert (ANTHROPIC_API_KEY oder OPENAI_API_KEY)");
}

// POST /api/ai/task-suggestions
// Body: { projectId, projectName, projectDescription, tasks, mode: "suggestions" | "prioritize" }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectName, projectDescription, tasks, mode = "suggestions" } = body;

    if (mode === "suggestions") {
      // Modus: Neue Task-Vorschläge generieren
      const taskListe =
        tasks?.length > 0
          ? tasks
              .slice(0, 20)
              .map((t: any) => `- [${t.status}] ${t.title}`)
              .join("\n")
          : "Keine Tasks vorhanden";

      const prompt = `Du bist ein Projektmanagement-Assistent für Koch Aufforstung GmbH.

Projekt: ${projectName ?? "Unbekannt"}
Beschreibung: ${projectDescription ?? "Keine Beschreibung"}

Bestehende Tasks:
${taskListe}

Erstelle genau 5 neue Task-Vorschläge für dieses Projekt. 
Antworte NUR mit einem JSON-Array (kein Markdown, kein Code-Block), Beispiel:
[
  {"titel": "Task-Name", "beschreibung": "Kurze Beschreibung", "prioritaet": "medium"},
  ...
]

Prioritäten: low, medium, high, urgent
Sprache: Deutsch
Sei konkret und praxisnah für ein Forstunternehmen.`;

      const antwort = await kiAnfrage(prompt);

      // JSON aus Antwort extrahieren
      const jsonMatch = antwort.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "KI-Antwort konnte nicht geparst werden", raw: antwort },
          { status: 422 }
        );
      }

      const vorschlaege: TaskVorschlag[] = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ vorschlaege });
    }

    if (mode === "prioritize") {
      // Modus: Bestehende Tasks priorisieren
      if (!tasks?.length) {
        return NextResponse.json({ error: "Keine Tasks übergeben" }, { status: 400 });
      }

      const taskListe = tasks
        .slice(0, 30)
        .map((t: any) => `ID:${t.id} [${t.status}] ${t.title}${t.description ? ": " + t.description.slice(0, 80) : ""}`)
        .join("\n");

      const prompt = `Du bist ein Projektmanagement-Assistent für Koch Aufforstung GmbH.

Projekt: ${projectName ?? "Unbekannt"}
Beschreibung: ${projectDescription ?? ""}

Analysiere folgende Tasks und empfehle Prioritäten:
${taskListe}

Antworte NUR mit einem JSON-Array:
[
  {"taskId": "...", "empfohlene_prioritaet": "high", "begruendung": "Kurze Begründung"},
  ...
]

Prioritäten: low, medium, high, urgent
Beachte: Blockierte/offene Tasks ohne Fortschritt = höhere Priorität.
Sprache: Deutsch`;

      const antwort = await kiAnfrage(prompt);
      const jsonMatch = antwort.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "KI-Antwort konnte nicht geparst werden", raw: antwort },
          { status: 422 }
        );
      }

      const ergebnisse: PriorisierungErgebnis[] = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ ergebnisse });
    }

    return NextResponse.json({ error: "Unbekannter Modus" }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/ai/task-suggestions]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
