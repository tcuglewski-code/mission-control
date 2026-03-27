import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/agents — Alle registrierten Agenten auflisten
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agents = await prisma.agentRegistry.findMany({
      orderBy: { letzteAktivitaet: "desc" },
    });

    // Status auf "offline" setzen wenn länger als 5 Minuten inaktiv
    const jetzt = new Date();
    const fuenfMinuten = 5 * 60 * 1000;

    const agentsAngereichert = agents.map((agent) => {
      let status = agent.status;
      if (
        agent.letzteAktivitaet &&
        jetzt.getTime() - agent.letzteAktivitaet.getTime() > fuenfMinuten &&
        agent.status === "online"
      ) {
        status = "offline";
      }
      return { ...agent, status };
    });

    return NextResponse.json(agentsAngereichert);
  } catch (error) {
    console.error("[GET /api/agents]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/agents — Neuen Agenten registrieren
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, beschreibung, capabilities, version, endpoint, metadata } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // Upsert: falls Agent mit diesem Namen bereits existiert, aktualisieren
    const agent = await prisma.agentRegistry.upsert({
      where: { name: name.trim() },
      update: {
        beschreibung: beschreibung ?? undefined,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        status: "online",
        letzteAktivitaet: new Date(),
        version: version ?? undefined,
        endpoint: endpoint ?? undefined,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
      create: {
        name: name.trim(),
        beschreibung: beschreibung ?? null,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        status: "online",
        letzteAktivitaet: new Date(),
        version: version ?? null,
        endpoint: endpoint ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("[POST /api/agents]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
