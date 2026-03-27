import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/agents/heartbeat
// Agenten senden regelmäßig einen Heartbeat um Online-Status zu signalisieren
// Kein Auth-Header erforderlich (öffentlich für interne Agenten)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, status = "online", metadata } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    // Agenten-Status aktualisieren oder neu anlegen
    const agent = await prisma.agentRegistry.upsert({
      where: { name: name.trim() },
      update: {
        status,
        letzteAktivitaet: new Date(),
        ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
      },
      create: {
        name: name.trim(),
        status,
        letzteAktivitaet: new Date(),
        capabilities: [],
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      ok: true,
      agentId: agent.id,
      status: agent.status,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/agents/heartbeat]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
