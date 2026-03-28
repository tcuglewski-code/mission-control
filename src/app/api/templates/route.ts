import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// ─── Forstspezifische System-Vorlagen ─────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  // ── Bestandsvorlagen (Sprint EK) ──
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
  // ── Neue Vorlagen (Sprint GG) ──
  {
    name: "Erstaufforstung Standard",
    description:
      "Vollständige Vorlage für Erstaufforstungsprojekte — von der Flächenanalyse über Förderantrag bis zur abgeschlossenen Kulturpflege. Geeignet für Flächen ab 1 ha.",
    category: "aufforstung",
    isSystem: true,
    milestones: [
      { title: "Planungsabschluss", description: "Fläche vermessen, Baumarten festgelegt, Förderantrag eingereicht", offsetDays: 30, color: "#3b82f6" },
      { title: "Pflanzung abgeschlossen", description: "Alle Setzlinge gepflanzt, Erstdokumentation erstellt", offsetDays: 90, color: "#22c55e" },
      { title: "Anwuchskontrolle Jahr 1", description: "Anwuchsrate > 80%, Nachpflanzungen abgeschlossen", offsetDays: 365, color: "#f59e0b" },
      { title: "Behördliche Abnahme", description: "Fördermittelnachweis erbracht, Abschlussbericht eingereicht", offsetDays: 1095, color: "#8b5cf6" },
    ],
    tasks: [
      { title: "Flächenbegehung durchführen", description: "Gelände aufnehmen, Bodentyp bestimmen, Wasserhaushalt prüfen", priority: "high", offsetDays: 0 },
      { title: "Bodenproben nehmen", description: "Bodenproben entnehmen und an Labor schicken, pH-Wert und Nährstoffe bestimmen", priority: "high", offsetDays: 3 },
      { title: "Standortgutachten erstellen", description: "Klimaeignung, Bodenqualität, Wasserverfügbarkeit bewerten", priority: "high", offsetDays: 10 },
      { title: "Baumarten-Konzept ausarbeiten", description: "Standortgerechte Baumarten wählen, Mischungsanteile festlegen, Klimaresilienz berücksichtigen", priority: "high", offsetDays: 14 },
      { title: "Förderantrag stellen", description: "Passende Förderprogramme (Bund/Land) recherchieren, Antrag mit Unterlagen einreichen", priority: "high", offsetDays: 21 },
      { title: "Setzlinge bestellen", description: "Baumschulen kontaktieren, Bestellmengen berechnen, Liefertermin vereinbaren", priority: "high", offsetDays: 28 },
      { title: "Fläche vorbereiten", description: "Bodenbearbeitung, Humusschicht anlegen, Schutzmaßnahmen gegen Verbiss planen", priority: "medium", offsetDays: 35 },
      { title: "Team einweisen", description: "Pflanzteam einweisen, Pflanztechnik demonstrieren, Sicherheitsunterweisung", priority: "medium", offsetDays: 42 },
      { title: "Pflanzung durchführen", description: "Setzlinge einpflanzen, Pflanzabstände einhalten, bei Trockenheit bewässern", priority: "urgent", offsetDays: 60 },
      { title: "Verbissschutz anbringen", description: "Einzelschutz (Wuchshüllen) oder Zäunung montieren", priority: "high", offsetDays: 65 },
      { title: "Erstdokumentation erstellen", description: "Pflanzenzahlen, GPS-Koordinaten, Fotos und Datum dokumentieren", priority: "medium", offsetDays: 70 },
      { title: "Anwuchskontrolle (3 Monate)", description: "Anwuchsrate prüfen, abgestorbene Pflanzen markieren", priority: "high", offsetDays: 150 },
      { title: "Nachpflanzungen durchführen", description: "Fehlstellen schließen, Ausfälle > 20% beheben", priority: "medium", offsetDays: 180 },
      { title: "Kulturpflege Jahr 1 (Mahd)", description: "Konkurrenzvegetation zurückschneiden, Kulturpflege dokumentieren", priority: "medium", offsetDays: 270 },
      { title: "Jahresbericht Jahr 1 erstellen", description: "Entwicklungsstand fotografieren, Bericht für Förderstelle vorbereiten", priority: "medium", offsetDays: 365 },
    ],
  },
  {
    name: "Waldpflege Basis",
    description:
      "Vorlage für Waldpflegemaßnahmen — Jungwuchs- und Dickungspflege, Läuterung, Wildschadensbeurteilung. Geeignet für laufende Bestände.",
    category: "pflege",
    isSystem: true,
    milestones: [
      { title: "Bestandsaufnahme abgeschlossen", description: "Alle Flächen kartiert, Pflegebedarf dokumentiert", offsetDays: 14, color: "#3b82f6" },
      { title: "Pflegearbeiten abgeschlossen", description: "Alle geplanten Pflegeeinheiten durchgeführt", offsetDays: 90, color: "#22c55e" },
    ],
    tasks: [
      { title: "Bestandsbegehung planen", description: "Begehungstermine festlegen, Karten vorbereiten, Team einteilen", priority: "high", offsetDays: 0 },
      { title: "Jungwuchspflege kartieren", description: "Pflegebedürftige Flächen markieren, Prioritäten setzen", priority: "high", offsetDays: 3 },
      { title: "Wildschadensprotokoll erstellen", description: "Verbiss- und Schälschäden dokumentieren, Fotos erstellen", priority: "medium", offsetDays: 5 },
      { title: "Pflegeplan erstellen", description: "Maßnahmen, Flächen, Mengen und Kosten planen", priority: "high", offsetDays: 7 },
      { title: "Läuterung durchführen", description: "Unerwünschte Arten entfernen, Zukunftsbäume freihalten", priority: "high", offsetDays: 21 },
      { title: "Dickungspflege abschließen", description: "Dichten Jungwuchs auflichten, Mischungsanteile regulieren", priority: "medium", offsetDays: 45 },
      { title: "Maßnahmen dokumentieren", description: "Durchgeführte Flächen, Aufwand, Ergebnis protokollieren", priority: "medium", offsetDays: 60 },
      { title: "Abschlussbericht erstellen", description: "Pflegemaßnahmen zusammenfassen, Fotos und Karten beifügen", priority: "low", offsetDays: 90 },
    ],
  },
  {
    name: "Förderantrag Begleitung",
    description:
      "Strukturierte Vorlage für die Begleitung von Förderanträgen (Bund/Land/EU). Von der Recherche bis zur Auszahlung — alle Schritte dokumentiert.",
    category: "foerderung",
    isSystem: true,
    milestones: [
      { title: "Antrag eingereicht", description: "Vollständiger Antrag mit allen Unterlagen bei Förderstelle eingegangen", offsetDays: 30, color: "#3b82f6" },
      { title: "Bewilligung erhalten", description: "Förderbescheid liegt vor, Projektumsetzung kann beginnen", offsetDays: 120, color: "#22c55e" },
      { title: "Verwendungsnachweis eingereicht", description: "Abrechnung und Nachweise fristgerecht eingereicht", offsetDays: 365, color: "#f59e0b" },
    ],
    tasks: [
      { title: "Förderprogramme recherchieren", description: "Bundes-, Landes- und EU-Förderprogramme prüfen, Fristen notieren", priority: "high", offsetDays: 0 },
      { title: "Förderfähigkeit prüfen", description: "Fläche, Maßnahme und Antragsteller auf Förderfähigkeit prüfen", priority: "high", offsetDays: 3 },
      { title: "Unterlagen zusammenstellen", description: "Eigentumsnachweise, Flurkarten, Betriebsplan, Vorangebote einholen", priority: "high", offsetDays: 7 },
      { title: "Kostenplan erstellen", description: "Detaillierte Kostenaufstellung, förderfähige vs. nicht-förderfähige Kosten trennen", priority: "high", offsetDays: 14 },
      { title: "Antragsdokumente ausfüllen", description: "Antragsformulare vollständig ausfüllen, Pflichtangaben prüfen", priority: "urgent", offsetDays: 21 },
      { title: "Antrag bei Förderstelle einreichen", description: "Antrag fristgerecht einreichen, Eingangsbestätigung sichern", priority: "urgent", offsetDays: 28 },
      { title: "Rückfragen der Förderstelle beantworten", description: "Nachforderungen prompt bearbeiten, Unterlagen ergänzen", priority: "high", offsetDays: 45 },
      { title: "Maßnahme durchführen", description: "Geförderte Maßnahme umsetzen, alle Belege sammeln", priority: "high", offsetDays: 120 },
      { title: "Zwischennachweis vorbereiten", description: "Bei mehrjährigen Projekten: Zwischenbericht und Abrechnung erstellen", priority: "medium", offsetDays: 180 },
      { title: "Rechnungen und Belege sammeln", description: "Alle Originalrechnungen, Zahlungsnachweise und Lohnnachweise sichern", priority: "high", offsetDays: 300 },
      { title: "Verwendungsnachweis erstellen", description: "Sachbericht und zahlenmäßigen Nachweis erstellen, Fotos beifügen", priority: "urgent", offsetDays: 340 },
      { title: "Verwendungsnachweis einreichen", description: "Fristgerechte Einreichung beim Fördergeber, Empfangsbestätigung aufbewahren", priority: "urgent", offsetDays: 365 },
    ],
  },
];

async function ensureSystemTemplates() {
  const systemCount = await prisma.projectTemplate.count({ where: { isSystem: true } });
  if (systemCount < SYSTEM_TEMPLATES.length) {
    // Alle system templates neu erstellen (Sprint GG erweitert um Meilensteine)
    await prisma.projectTemplate.deleteMany({ where: { isSystem: true } });
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
    const { name, description, category, tasks, milestones } = body;

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
        milestones: milestones ?? Prisma.JsonNull,
        isSystem: false,
        createdBy: user.id,
        createdByName: user.username || user.email || "Unbekannt",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[POST /api/templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
