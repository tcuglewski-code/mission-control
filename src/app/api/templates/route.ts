import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// Seed-Daten: 3 Basis-Vorlagen
const SEED_TEMPLATES = [
  {
    name: "Aufforstung Standard",
    description: "Standardvorlage für Aufforstungsprojekte",
    category: "aufforstung",
    tasks: [
      { title: "Fläche vermessen", description: "GPS-Vermessung der Aufforstungsfläche", priority: "high" },
      { title: "Baumarten auswählen", description: "Geeignete Baumarten für Standort und Klima bestimmen", priority: "high" },
      { title: "Pflanzlöcher vorbereiten", description: "Pflanzlöcher in vorgegebenem Raster ausheben", priority: "medium" },
      { title: "Pflanzung durchführen", description: "Setzlinge einpflanzen und wässern", priority: "high" },
      { title: "Dokumentation", description: "Fotodokumentation und Abschlussbericht erstellen", priority: "medium" },
    ],
  },
  {
    name: "Waldpflege",
    description: "Vorlage für Waldpflegeprojekte und Durchforstung",
    category: "pflege",
    tasks: [
      { title: "Bestandsaufnahme", description: "Aktuellen Waldbestand kartieren und bewerten", priority: "high" },
      { title: "Pflegeplan erstellen", description: "Maßnahmen planen und priorisieren", priority: "high" },
      { title: "Durchforstung", description: "Schwache und kranke Bäume entnehmen", priority: "medium" },
      { title: "Kulturpflege", description: "Jungpflanzen von Konkurrenzvegetation befreien", priority: "medium" },
      { title: "Abnahme und Protokoll", description: "Maßnahmen abnehmen und dokumentieren", priority: "low" },
    ],
  },
  {
    name: "Saatguternte",
    description: "Vorlage für die Saatguternte-Kampagne",
    category: "saatgut",
    tasks: [
      { title: "Erntereife prüfen", description: "Reifegrad des Saatguts an Mutterbäumen kontrollieren", priority: "high" },
      { title: "Team einteilen", description: "Ernteteams zusammenstellen und briefen", priority: "high" },
      { title: "Ernte durchführen", description: "Saatgut von Mutterbäumen ernten", priority: "high" },
      { title: "Trocknung", description: "Saatgut schonend trocknen und aufbereiten", priority: "medium" },
      { title: "Lagerung", description: "Saatgut kühl und trocken einlagern, Chargen dokumentieren", priority: "medium" },
    ],
  },
];

async function ensureSeedTemplates() {
  const count = await prisma.projectTemplate.count();
  if (count === 0) {
    await prisma.projectTemplate.createMany({
      data: SEED_TEMPLATES,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSeedTemplates();

    const templates = await prisma.projectTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("[GET /api/templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, tasks } = body;

    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "Tasks müssen ein Array sein" }, { status: 400 });
    }

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        tasks,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[POST /api/templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
