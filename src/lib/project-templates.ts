// ─── Forstspezifische Projekt-Vorlagen (Sprint GG) ───────────────────────────
// Definierte Vorlagen mit Tasks + Meilensteinen für die Vorlagen-Bibliothek.
// Werden beim Erstellen eines Projekts per API ausgespielt.

export interface TemplateTask {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  offsetDays: number; // Fälligkeitsdatum relativ zum Startdatum
}

export interface TemplateMilestone {
  title: string;
  description?: string;
  offsetDays: number; // Fälligkeitsdatum relativ zum Startdatum
  color: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  category: "aufforstung" | "pflege" | "foerderung" | "saatgut" | "allgemein";
  icon: string;
  tasks: TemplateTask[];
  milestones: TemplateMilestone[];
}

// ─── 1. Erstaufforstung Standard ─────────────────────────────────────────────

export const ERSTAUFFORSTUNG_STANDARD: ProjectTemplate = {
  name: "Erstaufforstung Standard",
  description:
    "Vollständige Vorlage für Erstaufforstungsprojekte — von der Flächenanalyse über Förderantrag bis zur abgeschlossenen Kulturpflege. Geeignet für Flächen ab 1 ha.",
  category: "aufforstung",
  icon: "🌲",
  milestones: [
    {
      title: "Planungsabschluss",
      description: "Fläche vermessen, Baumarten festgelegt, Förderantrag eingereicht",
      offsetDays: 30,
      color: "#3b82f6",
    },
    {
      title: "Pflanzung abgeschlossen",
      description: "Alle Setzlinge gepflanzt, Erstdokumentation erstellt",
      offsetDays: 90,
      color: "#22c55e",
    },
    {
      title: "Anwuchskontrolle Jahr 1",
      description: "Anwuchsrate > 80%, Nachpflanzungen abgeschlossen",
      offsetDays: 365,
      color: "#f59e0b",
    },
    {
      title: "Behördliche Abnahme",
      description: "Fördermittelnachweis erbracht, Abschlussbericht eingereicht",
      offsetDays: 1095,
      color: "#8b5cf6",
    },
  ],
  tasks: [
    // Phase 1: Planung
    {
      title: "Flächenbegehung durchführen",
      description: "Gelände aufnehmen, Bodentyp bestimmen, Wasserhaushalt prüfen",
      priority: "high",
      offsetDays: 0,
    },
    {
      title: "Bodenproben nehmen",
      description: "Bodenproben entnehmen und an Labor schicken, pH-Wert und Nährstoffe bestimmen",
      priority: "high",
      offsetDays: 3,
    },
    {
      title: "Standortgutachten erstellen",
      description: "Klimaeignung, Bodenqualität, Wasserverfügbarkeit bewerten",
      priority: "high",
      offsetDays: 10,
    },
    {
      title: "Baumarten-Konzept ausarbeiten",
      description: "Standortgerechte Baumarten wählen, Mischungsanteile festlegen, Klimaresilienz berücksichtigen",
      priority: "high",
      offsetDays: 14,
    },
    {
      title: "Förderantrag stellen",
      description: "Passende Förderprogramme (Bund/Land) recherchieren, Antrag mit Unterlagen einreichen",
      priority: "high",
      offsetDays: 21,
    },
    // Phase 2: Vorbereitung
    {
      title: "Setzlinge bestellen",
      description: "Baumschulen kontaktieren, Bestellmengen berechnen, Liefertermin vereinbaren",
      priority: "high",
      offsetDays: 28,
    },
    {
      title: "Fläche vorbereiten",
      description: "Bodenbearbeitung, Humusschicht anlegen, Schutzmaßnahmen gegen Verbiss planen",
      priority: "medium",
      offsetDays: 35,
    },
    {
      title: "Team einweisen",
      description: "Pflanzteam einweisen, Pflanztechnik demonstrieren, Sicherheitsunterweisung",
      priority: "medium",
      offsetDays: 42,
    },
    // Phase 3: Pflanzung
    {
      title: "Pflanzung durchführen",
      description: "Setzlinge einpflanzen, Pflanzabstände einhalten, bei Trockenheit bewässern",
      priority: "urgent",
      offsetDays: 60,
    },
    {
      title: "Verbissschutz anbringen",
      description: "Einzelschutz (Wuchshüllen) oder Zäunung montieren",
      priority: "high",
      offsetDays: 65,
    },
    {
      title: "Erstdokumentation erstellen",
      description: "Pflanzenzahlen, GPS-Koordinaten, Fotos und Datum dokumentieren",
      priority: "medium",
      offsetDays: 70,
    },
    // Phase 4: Pflege
    {
      title: "Anwuchskontrolle (3 Monate)",
      description: "Anwuchsrate prüfen, abgestorbene Pflanzen markieren",
      priority: "high",
      offsetDays: 150,
    },
    {
      title: "Nachpflanzungen durchführen",
      description: "Fehlstellen schließen, Ausfälle > 20% beheben",
      priority: "medium",
      offsetDays: 180,
    },
    {
      title: "Kulturpflege Jahr 1 (Mahd/Mähwerkzeug)",
      description: "Konkurrenzvegetation zurückschneiden, Kulturpflege dokumentieren",
      priority: "medium",
      offsetDays: 270,
    },
    {
      title: "Jahresbericht Jahr 1 erstellen",
      description: "Entwicklungsstand fotografieren, Bericht für Förderstelle vorbereiten",
      priority: "medium",
      offsetDays: 365,
    },
  ],
};

// ─── 2. Waldpflege Basis ──────────────────────────────────────────────────────

export const WALDPFLEGE_BASIS: ProjectTemplate = {
  name: "Waldpflege Basis",
  description:
    "Vorlage für Waldpflegemaßnahmen — Jungwuchs- und Dickungspflege, Läuterung, Wildschadensbeurteilung. Geeignet für laufende Bestände.",
  category: "pflege",
  icon: "🪓",
  milestones: [
    {
      title: "Bestandsaufnahme abgeschlossen",
      description: "Alle Flächen kartiert, Pflegebedarf dokumentiert",
      offsetDays: 14,
      color: "#3b82f6",
    },
    {
      title: "Pflegearbeiten abgeschlossen",
      description: "Alle geplanten Pflegeeinheiten durchgeführt",
      offsetDays: 90,
      color: "#22c55e",
    },
  ],
  tasks: [
    {
      title: "Bestandsbegehung planen",
      description: "Begehungstermine festlegen, Karten vorbereiten, Team einteilen",
      priority: "high",
      offsetDays: 0,
    },
    {
      title: "Jungwuchspflege kartieren",
      description: "Pflegebedürftige Flächen markieren, Prioritäten setzen",
      priority: "high",
      offsetDays: 3,
    },
    {
      title: "Wildschadensprotokoll erstellen",
      description: "Verbiss- und Schälschäden dokumentieren, Fotos erstellen",
      priority: "medium",
      offsetDays: 5,
    },
    {
      title: "Pflegeplan erstellen",
      description: "Maßnahmen, Flächen, Mengen und Kosten planen",
      priority: "high",
      offsetDays: 7,
    },
    {
      title: "Läuterung durchführen",
      description: "Unerwünschte Arten entfernen, Zukunftsbäume freihalten",
      priority: "high",
      offsetDays: 21,
    },
    {
      title: "Dickungspflege abschließen",
      description: "Dichten Jungwuchs auflichten, Mischungsanteile regulieren",
      priority: "medium",
      offsetDays: 45,
    },
    {
      title: "Maßnahmen dokumentieren",
      description: "Durchgeführte Flächen, Aufwand, Ergebnis protokollieren",
      priority: "medium",
      offsetDays: 60,
    },
    {
      title: "Abschlussbericht erstellen",
      description: "Pflegemaßnahmen zusammenfassen, Fotos und Karten beifügen",
      priority: "low",
      offsetDays: 90,
    },
  ],
};

// ─── 3. Förderantrag Begleitung ────────────────────────────────────────────────

export const FOERDERANTRAG_BEGLEITUNG: ProjectTemplate = {
  name: "Förderantrag Begleitung",
  description:
    "Strukturierte Vorlage für die Begleitung von Förderanträgen (Bund/Land/EU). Von der Recherche bis zur Auszahlung — alle Schritte dokumentiert.",
  category: "foerderung",
  icon: "📋",
  milestones: [
    {
      title: "Antrag eingereicht",
      description: "Vollständiger Antrag mit allen Unterlagen bei Förderstelle eingegangen",
      offsetDays: 30,
      color: "#3b82f6",
    },
    {
      title: "Bewilligung erhalten",
      description: "Förderbescheid liegt vor, Projektumsetzung kann beginnen",
      offsetDays: 120,
      color: "#22c55e",
    },
    {
      title: "Verwendungsnachweis eingereicht",
      description: "Abrechnung und Nachweise fristgerecht eingereicht",
      offsetDays: 365,
      color: "#f59e0b",
    },
  ],
  tasks: [
    // Phase 1: Recherche & Vorbereitung
    {
      title: "Förderprogramme recherchieren",
      description: "Bundes-, Landes- und EU-Förderprogramme prüfen, Fristen notieren",
      priority: "high",
      offsetDays: 0,
    },
    {
      title: "Förderfähigkeit prüfen",
      description: "Fläche, Maßnahme und Antragsteller auf Förderfähigkeit prüfen",
      priority: "high",
      offsetDays: 3,
    },
    {
      title: "Unterlagen zusammenstellen",
      description: "Eigentumsnachweise, Flurkarten, Betriebsplan, Vorangebote einholen",
      priority: "high",
      offsetDays: 7,
    },
    {
      title: "Kostenplan erstellen",
      description: "Detaillierte Kostenaufstellung, förderfähige vs. nicht-förderfähige Kosten trennen",
      priority: "high",
      offsetDays: 14,
    },
    // Phase 2: Antragstellung
    {
      title: "Antragsdokumente ausfüllen",
      description: "Antragsformulare vollständig ausfüllen, Pflichtangaben prüfen",
      priority: "urgent",
      offsetDays: 21,
    },
    {
      title: "Antrag bei Förderstelle einreichen",
      description: "Antrag fristgerecht einreichen, Eingangsbestätigung sichern",
      priority: "urgent",
      offsetDays: 28,
    },
    {
      title: "Rückfragen der Förderstelle beantworten",
      description: "Nachforderungen prompt bearbeiten, Unterlagen ergänzen",
      priority: "high",
      offsetDays: 45,
    },
    // Phase 3: Projektdurchführung
    {
      title: "Maßnahme durchführen",
      description: "Geförderte Maßnahme umsetzen, alle Belege sammeln",
      priority: "high",
      offsetDays: 120,
    },
    {
      title: "Zwischennachweis vorbereiten",
      description: "Bei mehrjährigen Projekten: Zwischenbericht und Abrechnung erstellen",
      priority: "medium",
      offsetDays: 180,
    },
    // Phase 4: Abrechnung
    {
      title: "Rechnungen und Belege sammeln",
      description: "Alle Originalrechnungen, Zahlungsnachweise und Lohnnachweise sichern",
      priority: "high",
      offsetDays: 300,
    },
    {
      title: "Verwendungsnachweis erstellen",
      description: "Sachbericht und zahlenmäßigen Nachweis erstellen, Fotos beifügen",
      priority: "urgent",
      offsetDays: 340,
    },
    {
      title: "Verwendungsnachweis einreichen",
      description: "Fristgerechte Einreichung beim Fördergeber, Empfangsbestätigung aufbewahren",
      priority: "urgent",
      offsetDays: 365,
    },
  ],
};

// ─── Alle neuen Vorlagen (für Seed/Initialisierung) ───────────────────────────

export const NEW_FOREST_TEMPLATES: ProjectTemplate[] = [
  ERSTAUFFORSTUNG_STANDARD,
  WALDPFLEGE_BASIS,
  FOERDERANTRAG_BEGLEITUNG,
];

// ─── Hilfsfunktion: Template → API-Payload für create-project ─────────────────

export function templateToSeedPayload(tpl: ProjectTemplate) {
  return {
    name: tpl.name,
    description: tpl.description,
    category: tpl.category,
    isSystem: true,
    tasks: tpl.tasks.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      offsetDays: t.offsetDays,
    })),
    milestones: tpl.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      offsetDays: m.offsetDays,
      color: m.color,
    })),
  };
}
