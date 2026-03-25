/**
 * In-Memory Rate-Limiter (kein Redis erforderlich)
 *
 * Hinweis: In serverlosen Umgebungen (z.B. Vercel Edge Functions) ist der
 * Speicher pro Instanz isoliert. Für produktionsreifes Multi-Instance-Rate-Limiting
 * wäre Redis/KV-Speicher empfehlenswert.
 */

interface RateLimitEintrag {
  anzahl: number
  zuruecksetzenAm: number
}

const speicher = new Map<string, RateLimitEintrag>()

// Zeitstempel der letzten Bereinigung
let letzterCleanup = Date.now()

/**
 * Prüft ob eine Anfrage erlaubt ist.
 * @param schluessel  Eindeutiger Schlüssel (z.B. "login:1.2.3.4" oder "api:1.2.3.4")
 * @param max         Maximale Anzahl Anfragen im Zeitfenster
 * @param fensterMs   Zeitfenster in Millisekunden
 * @returns true = erlaubt, false = gesperrt (Rate-Limit überschritten)
 */
export function rateLimit(schluessel: string, max: number, fensterMs: number): boolean {
  const jetzt = Date.now()

  // Lazy Cleanup: Alle 5 Minuten abgelaufene Einträge entfernen
  if (jetzt - letzterCleanup > 5 * 60 * 1000) {
    for (const [k, eintrag] of speicher.entries()) {
      if (eintrag.zuruecksetzenAm < jetzt) speicher.delete(k)
    }
    letzterCleanup = jetzt
  }

  const eintrag = speicher.get(schluessel)

  if (!eintrag || eintrag.zuruecksetzenAm < jetzt) {
    // Neues Fenster starten
    speicher.set(schluessel, { anzahl: 1, zuruecksetzenAm: jetzt + fensterMs })
    return true // erlaubt
  }

  if (eintrag.anzahl >= max) return false // gesperrt

  eintrag.anzahl++
  return true // erlaubt
}
