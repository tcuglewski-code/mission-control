import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// ─── Forstspezifische System-Vorlagen ─────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    name: "Aufforstungsprojekt",
    description: "Vollständige Vorlage für Aufforstungsprojekte — von der Flächenanalyse bis zur Abnahme",
    category: "aufforstung",
    isSystem: true,
    tasks: [
      { title: "Flächenanalyse", description: "Geländeaufnahme, Bodenproben, Klimaeignung prüfen", priority: "high", offsetDays: 0 },
      { title: "Förderantrag stellen", description: "Förderprogramme recherchieren und Antrag einreichen", priority: "high", offsetDays: 7 },
      { title: "Baumarten-Auswahl", description: "Geeignete Baumarten für Standort, Klima und Förderbedingungen bestimmen", priority: "high", offsetDays: 14 },
      { title: "Pflanzung", description: "Setzlinge einpflanzen, Pflanzlöcher vorbereiten, wässern", priority: "high", offsetDays: 30 },
      { title: "Kulturpflege Jahr 1", description: "Anwuchskontrolle, Nachpflanzungen, Unkrautbekämpfung", priority: "medium", offsetDays: 90 },
      { title: "Kulturpflege Jahr 2", description: "Zweite Pflegemaßnahme, Schutzmaßnahmen kontrollieren", priority: "medium", offsetDays: 455 },
      { title: "Kulturpflege Jahr 3", description: "Dritte Pflegemaßnahme, Bestandsentwicklung dokumentieren", priority: "medium", offsetDays: 820 },
      { title: "Abnahme", description: "Behördliche Abnahme, Fördermittelnachweis, Abschlussbericht", priority: "high", offsetDays: 1095 },
    ],
  },
  {
    name: "Wiederbewaldung nach Schaden",
    description: "Vorlage für Wiederbewaldungsprojekte nach Kalamitäten (Sturm, Käfer, Brand)",
    category: "aufforstung",
    isSystem: true,
    tasks: [
      { title: "Schadensaufnahme", description: "Schadensausmaß kartieren, Ursache dokumentieren, Fotos erstellen", priority: "high", offsetDays: 0 },
      { title: "Räumung", description: "Schadholz räumen, Fläche für Neupflanzung vorbereiten", priority: "high", offsetDays: 7 },
      { title: "Förderantrag stellen", description: "Kalamitätsförderprogramme beantragen, Gutachten beifügen", priority: "high", offsetDays: 14 },
      { title: "Pflanzung", description: "Standortgerechte Baumarten einpflanzen, Schutzmaßnahmen installieren", priority: "high", offsetDays: 45 },
    ],
  },
  {
    name: "Saatguternte",
    description: "Vorlage für die Saatguternte-Kampagne — von der Planung bis zur Einlagerung",
    category: "saatgut",
    isSystem: true,
    tasks: [
      { title: "Ernteplanung", description: "Erntetermine festlegen, Teams einteilen, Ernteflächen kartieren", priority: "high", offsetDays: 0 },
      { title: "Baumauswahl", description: "Geeignete Mutterbäume auswählen, Reifekontrolle durchführen", priority: "high", offsetDays: 7 },
      { title: "Ernte", description: "Saatgut von Mutterbäumen ernten, Mengen dokumentieren", priority: "high", offsetDays: 14 },
      { title: "Aufbereitung", description: "Saatgut reinigen, trocknen und sortieren", priority: "medium", offsetDays: 21 },
      { title: "Lagerung", description: "Saatgut kühl und trocken einlagern, Chargendokumentation erstellen", priority: "medium", offsetDays: 28 },
    ],
  },
];

async function ensureSystemTemplates() {
  const systemCount = await prisma.projectTemplate.count({ where: { isSystem: true } });
  if (systemCount === 0) {
    // Alte Seed-Templates (nicht-system) löschen falls vorhanden
    await prisma.projectTemplate.deleteMany({ where: { isSystem: false, createdBy: null } });
    await prisma.projectTemplate.createMany({
      data: SYSTEM_TEMPLATES,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSystemTemplates();

    const templates = await prisma.projectTemplate.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
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
        isSystem: false,
        createdBy: user.id,
        createdByName: user.name || user.email || "Unbekannt",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[POST /api/templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
