/**
 * Hilfsfunktionen für wiederkehrende Tasks
 */

export type RecurringIntervalType = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

/**
 * Berechnet das nächste Fälligkeitsdatum basierend auf Intervall und aktuellem Datum.
 * @param current  Aktuelles Fälligkeitsdatum (Basis)
 * @param interval Wiederholungsintervall
 * @param recurringDay Wochentag (1=Mo..7=So) für WEEKLY oder Tag des Monats (1-31) für MONTHLY
 */
export function calcNextDueDate(
  current: Date,
  interval: RecurringIntervalType,
  recurringDay?: number | null
): Date {
  const next = new Date(current);

  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;

    case "WEEKLY": {
      if (recurringDay && recurringDay >= 1 && recurringDay <= 7) {
        // Nächsten Wochentag finden (1=Mo, 7=So → JS: 0=So, 1=Mo, ...6=Sa)
        const jsDay = recurringDay === 7 ? 0 : recurringDay; // Sonntag-Konvertierung
        const currentDay = next.getDay();
        let daysUntil = jsDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        next.setDate(next.getDate() + daysUntil);
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;
    }

    case "MONTHLY": {
      next.setMonth(next.getMonth() + 1);
      if (recurringDay && recurringDay >= 1 && recurringDay <= 31) {
        // Tag des Monats setzen (max. auf letzten Tag des Monats begrenzen)
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(recurringDay, lastDay));
      }
      break;
    }

    case "QUARTERLY": {
      next.setMonth(next.getMonth() + 3);
      if (recurringDay && recurringDay >= 1 && recurringDay <= 31) {
        // Tag des Monats setzen (für Ende des Quartals, z.B. 31. März → 30. Juni)
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(recurringDay, lastDay));
      }
      break;
    }

    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Gibt eine lesbare Beschreibung des Wiederholungsintervalls zurück (Deutsch).
 */
export function getRecurringLabel(
  interval: RecurringIntervalType,
  recurringDay?: number | null
): string {
  const WOCHENTAGE = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  switch (interval) {
    case "DAILY":
      return "Täglich";
    case "WEEKLY":
      if (recurringDay && recurringDay >= 1 && recurringDay <= 7) {
        return `Wöchentlich ${WOCHENTAGE[recurringDay]}s`;
      }
      return "Wöchentlich";
    case "MONTHLY":
      if (recurringDay) {
        return `Monatlich am ${recurringDay}.`;
      }
      return "Monatlich";
    case "QUARTERLY":
      if (recurringDay) {
        return `Quartalsweise am ${recurringDay}.`;
      }
      return "Quartalsweise";
    case "YEARLY":
      return "Jährlich";
    default:
      return interval;
  }
}
