/**
 * lib/ai.ts — KI-Wrapper für Mission Control
 * Feature-Flag: Prüft ob ANTHROPIC_API_KEY gesetzt ist.
 * Wenn nicht gesetzt → alle KI-Funktionen geben Feature-disabled zurück.
 */

const MODEL = "claude-3-5-haiku-20241022";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export function isAiAvailable(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY);
}

async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nicht gesetzt — KI-Features nicht verfügbar.");
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "user", content: prompt },
  ];

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 1024,
    messages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API Fehler: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ─── generateProjectSummary ─────────────────────────────────────────────────

export interface ProjectSummaryInput {
  projectName: string;
  projectDescription?: string | null;
  status: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    description?: string | null;
  }>;
}

export async function generateProjectSummary(input: ProjectSummaryInput): Promise<string> {
  const openTasks = input.tasks.filter((t) => t.status !== "done");
  const doneTasks = input.tasks.filter((t) => t.status === "done");
  const blockers = input.tasks.filter((t) => t.priority === "critical" && t.status !== "done");

  const taskList = openTasks
    .slice(0, 20)
    .map((t) => `- [${t.status}] [${t.priority}] ${t.title}${t.description ? ` — ${t.description.slice(0, 60)}` : ""}`)
    .join("\n");

  const blockerList = blockers
    .map((t) => `- ${t.title}`)
    .join("\n");

  const prompt = `Du bist ein Projektmanagement-Assistent für Koch Aufforstung GmbH.

Projekt: ${input.projectName}
Status: ${input.status}
Beschreibung: ${input.projectDescription ?? "Keine"}
Fortschritt: ${doneTasks.length}/${input.tasks.length} Tasks erledigt

Offene Tasks:
${taskList || "Keine offenen Tasks"}

${blockerList ? `Kritische Blocker:\n${blockerList}` : ""}

Erstelle eine prägnante Projektzusammenfassung (max. 3 Absätze) auf Deutsch:
1. Aktueller Stand & Fortschritt
2. Offene Schwerpunkte & nächste Schritte
3. Risiken / Blocker (falls vorhanden)

Sei direkt und informativ. Keine Einleitung wie "Hier ist die Zusammenfassung".`;

  return callClaude(prompt, "Du bist ein effizienter Projektmanager. Antworte prägnant auf Deutsch.");
}

// ─── generateTaskDescription ────────────────────────────────────────────────

export interface TaskDescriptionInput {
  title: string;
  projectName?: string;
  projectDescription?: string | null;
  existingTasks?: Array<{ title: string; status: string }>;
}

export async function generateTaskDescription(input: TaskDescriptionInput): Promise<string> {
  const context = input.existingTasks
    ? `Andere Tasks im Projekt:\n${input.existingTasks
        .slice(0, 10)
        .map((t) => `- [${t.status}] ${t.title}`)
        .join("\n")}`
    : "";

  const prompt = `Du bist ein Projektmanagement-Assistent für Koch Aufforstung GmbH.

Task-Titel: "${input.title}"
${input.projectName ? `Projekt: ${input.projectName}` : ""}
${input.projectDescription ? `Projekt-Beschreibung: ${input.projectDescription}` : ""}
${context}

Schlage eine präzise Aufgabenbeschreibung (2-4 Sätze) für diesen Task vor.
- Was genau ist zu tun?
- Welche Kriterien gelten als "erledigt"?
- Eventuell: Abhängigkeiten oder besondere Hinweise?

Nur die Beschreibung ausgeben, kein "Hier ist die Beschreibung:" o.ä.
Sprache: Deutsch`;

  return callClaude(prompt);
}
