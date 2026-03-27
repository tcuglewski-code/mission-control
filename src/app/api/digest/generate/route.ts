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
5. 📋 **Empfehlungen für heute** (3 konkrete Punkte)

Sprache: Deutsch. Ton: Professionell, motivierend, präzise. Max 400 Wörter.`;

    let inhalt: string;

    try {
      inhalt = await kiDigestGenerieren(prompt);
      if (!inhalt) throw new Error("Keine KI-Antwort");
    } catch {
      // Fallback ohne KI
      inhalt = `# 📊 Tagesdigest — ${format(jetzt, "d. MMMM yyyy", { locale: de })}

## 🌅 Heutiger Überblick
Automatisch generierter Digest für Mission Control (Koch Aufforstung GmbH).

## ✅ Fertiggestellt (letzte 24h)
${fertigeTasks.length > 0 ? fertigeTasks.map((t) => `- ${t.title}`).join("\n") : "_Keine Tasks abgeschlossen_"}

## 🆕 Neu erstellt
${neueTask.length > 0 ? neueTask.map((t) => `- [${t.priority}] ${t.title}`).join("\n") : "_Keine neuen Tasks_"}

## 🚫 Blockiert
${blockierteTasks.length > 0 ? blockierteTasks.map((t) => `- ${t.title}`).join("\n") : "_Keine blockierten Tasks_"}

## 📊 Statistik
- Offene Tasks: ${alleTasks.filter((t) => t.status === "todo").length}
- In Arbeit: ${alleTasks.filter((t) => t.status === "in_progress").length}
- Hohe Priorität: ${hochprioritaet.length}

_Digest generiert am ${format(jetzt, "d. MMMM yyyy, HH:mm", { locale: de })} Uhr_`;
    }

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
