/**
 * Smart-Filter Parser — Sprint FZ
 * Parst Filter-Strings wie: "assignee:ich status:offen prio:hoch due:heute"
 */

export interface ParsedFilter {
  query: string;         // Freitext ohne Filter-Tokens
  assignee?: string;     // "ich" oder User-Name
  project?: string;      // Projekt-Name
  status?: string;       // "offen" | "erledigt" | "in_progress" | ...
  priority?: string;     // "hoch" | "mittel" | "niedrig"
  due?: "heute" | "diese-woche" | "überfällig";
  blocked?: boolean;
}

// Mapping Deutsche Begriffe → DB-Werte
export const STATUS_MAP: Record<string, string> = {
  offen: "todo",
  todo: "todo",
  backlog: "backlog",
  "in_progress": "in_progress",
  "in-bearbeitung": "in_progress",
  "in bearbeitung": "in_progress",
  "in_review": "in_review",
  "in-review": "in_review",
  erledigt: "done",
  done: "done",
  blockiert: "blocked",
  blocked: "blocked",
};

export const PRIORITY_MAP: Record<string, string> = {
  hoch: "high",
  high: "high",
  mittel: "medium",
  medium: "medium",
  niedrig: "low",
  low: "low",
  urgent: "urgent",
  dringend: "urgent",
};

const TOKEN_RE = /(\w+):("[^"]+"|[\w-äöüÄÖÜß]+)/g;

export function parseSmartFilter(raw: string): ParsedFilter {
  const result: ParsedFilter = { query: raw };
  const tokens: string[] = [];

  let match: RegExpExecArray | null;
  const cleanRaw = raw;
  // Reset lastIndex
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(cleanRaw)) !== null) {
    const [full, key, val] = match;
    const value = val.replace(/^"|"$/g, "").toLowerCase().trim();
    tokens.push(full);

    switch (key.toLowerCase()) {
      case "assignee":
      case "zugewiesen":
        result.assignee = value;
        break;
      case "project":
      case "projekt":
        result.project = value;
        break;
      case "status":
        result.status = STATUS_MAP[value] ?? value;
        break;
      case "prio":
      case "priority":
      case "priorität":
        result.priority = PRIORITY_MAP[value] ?? value;
        break;
      case "due":
      case "fällig":
        result.due = value as ParsedFilter["due"];
        break;
      case "filter":
        if (value === "blocked" || value === "blockiert") result.blocked = true;
        break;
    }
  }

  // Freitext = alles ohne die Filter-Tokens
  result.query = tokens
    .reduce((s, t) => s.replace(t, ""), raw)
    .trim()
    .replace(/\s+/g, " ");

  return result;
}

/** Gibt die Filter-Tokens eines ParsedFilter als Array zurück (für Chips) */
export function filterToChips(f: ParsedFilter): Array<{ key: string; value: string; label: string }> {
  const chips: Array<{ key: string; value: string; label: string }> = [];
  if (f.assignee) chips.push({ key: "assignee", value: f.assignee, label: `👤 ${f.assignee === "ich" ? "Mir zugewiesen" : f.assignee}` });
  if (f.project) chips.push({ key: "project", value: f.project, label: `📁 ${f.project}` });
  if (f.status) chips.push({ key: "status", value: f.status, label: `🏷️ ${statusLabel(f.status)}` });
  if (f.priority) chips.push({ key: "priority", value: f.priority, label: `⚡ ${priorityLabel(f.priority)}` });
  if (f.due) chips.push({ key: "due", value: f.due, label: `📅 ${dueLabel(f.due)}` });
  if (f.blocked) chips.push({ key: "blocked", value: "true", label: "🚫 Blockiert" });
  return chips;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    todo: "Offen", backlog: "Backlog", in_progress: "In Bearbeitung",
    in_review: "In Prüfung", done: "Erledigt", blocked: "Blockiert",
  };
  return map[s] ?? s;
}

function priorityLabel(p: string) {
  const map: Record<string, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig", urgent: "Dringend" };
  return map[p] ?? p;
}

function dueLabel(d: string) {
  const map: Record<string, string> = { heute: "Heute fällig", "diese-woche": "Diese Woche", überfällig: "Überfällig" };
  return map[d] ?? d;
}
