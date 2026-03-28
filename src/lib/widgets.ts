export interface WidgetDefinition {
  id: string;
  title: string;
  defaultVisible: boolean;
  defaultOrder: number;
  description: string;
}

export interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: "offene-tasks",
    title: "Offene Tasks",
    defaultVisible: true,
    defaultOrder: 0,
    description: "Übersicht aller offenen Aufgaben",
  },
  {
    id: "meine-tasks",
    title: "Meine Tasks",
    defaultVisible: true,
    defaultOrder: 1,
    description: "Dir zugewiesene Aufgaben",
  },
  {
    id: "projekte-uebersicht",
    title: "Projekte-Übersicht",
    defaultVisible: true,
    defaultOrder: 2,
    description: "Aktive Projekte und Fortschritt",
  },
  {
    id: "letzte-aktivitaet",
    title: "Letzte Aktivität",
    defaultVisible: true,
    defaultOrder: 3,
    description: "Neueste Aktivitäten im System",
  },
  {
    id: "meilensteine",
    title: "Meilensteine",
    defaultVisible: true,
    defaultOrder: 4,
    description: "Anstehende Meilensteine",
  },
  {
    id: "zeiterfassung-heute",
    title: "Zeiterfassung-Heute",
    defaultVisible: true,
    defaultOrder: 5,
    description: "Heutige Zeiteinträge",
  },
  {
    id: "team-auslastung",
    title: "Team-Auslastung",
    defaultVisible: false,
    defaultOrder: 6,
    description: "Auslastung der Teammitglieder",
  },
  {
    id: "budget-uebersicht",
    title: "Budget-Übersicht",
    defaultVisible: true,
    defaultOrder: 7,
    description: "Budget-Status aller Projekte",
  },
  {
    id: "aktueller-sprint",
    title: "Aktueller Sprint",
    defaultVisible: true,
    defaultOrder: 8,
    description: "Status des aktuellen Sprints",
  },
  {
    id: "zuletzt-besucht",
    title: "Zuletzt besucht",
    defaultVisible: true,
    defaultOrder: 9,
    description: "Die 5 zuletzt geöffneten Projekte und Tasks",
  },
  {
    id: "fokus-zeit",
    title: "Fokus-Zeit Heute",
    defaultVisible: true,
    defaultOrder: 10,
    description: "Pomodoro-Statistiken für heute",
  },
  {
    id: "kunden",
    title: "Kunden",
    defaultVisible: true,
    defaultOrder: 13,
    description: "Top 3 Kunden nach Umsatz + Neukunden diesen Monat",
  },
];

export const WIDGET_CONFIG_KEY = "mc_dashboard_widget_config";

export function getDefaultWidgetConfig(): WidgetConfig[] {
  return AVAILABLE_WIDGETS.map((w) => ({
    id: w.id,
    visible: w.defaultVisible,
    order: w.defaultOrder,
  }));
}

export function mergeWithDefaults(saved: WidgetConfig[]): WidgetConfig[] {
  const defaults = getDefaultWidgetConfig();
  const savedMap = new Map(saved.map((w) => [w.id, w]));
  return defaults.map((def) => savedMap.get(def.id) ?? def);
}
