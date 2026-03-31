# Research News Cron (AF055)

Automatischer wöchentlicher Branchen-Report via Perplexity API.

## Übersicht

| Eigenschaft | Wert |
|------------|------|
| Route | `/api/cron/research-news` |
| Schedule | Montag 09:00 Uhr (Europe/Berlin) |
| Cron Expression | `0 7 * * 1` (UTC) |
| API | Perplexity sonar-pro |

## Zielbranchen

Der Cron sucht nach News in diesen Feldhub-Zielbranchen:

1. **Forstbetriebe und Forstwirtschaft**
2. **Landschaftsbau und Gartenbau**
3. **Tiefbau und Bauunternehmen**
4. **Gebäudereinigung und Facility Management**
5. **Landwirtschaft und Agrarbetriebe**

## Funktionsweise

1. **Perplexity-Suche**: Aktuelle News der letzten 7 Tage zu allen Zielbranchen
2. **Task-Erstellung**: MC-Task mit vollständigem Report (Projekt: Feldhub/Research/App-Fabrik)
3. **Telegram-Report**: Gekürzte Zusammenfassung an TELEGRAM_CHAT_ID

## Suchfokus

- Neue Software-Lösungen und Digitalisierung
- Gesetzliche Änderungen und Regulierungen
- Förderprogramme und Subventionen
- Markttrends und Wachstum
- Relevante Events und Messen

## ENV-Variablen

```bash
# Pflicht für den Cron
PERPLEXITY_API_KEY=pplx-...

# Optional (für Telegram-Report)
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=-100...

# Vercel Cron Auth (Pflicht)
CRON_SECRET=...
```

## API Response

```json
{
  "success": true,
  "timestamp": "2026-03-31T07:00:00.000Z",
  "weekNumber": 14,
  "taskId": "cm...",
  "telegramSent": true,
  "contentLength": 1234,
  "duration": 5432
}
```

## Manueller Trigger

```bash
# Via curl (benötigt CRON_SECRET)
curl -X POST https://mission-control-tawny-omega.vercel.app/api/cron/research-news \
  -H "Authorization: Bearer $CRON_SECRET"

# Via MC API Key
curl -X POST https://mission-control-tawny-omega.vercel.app/api/cron/research-news \
  -H "Authorization: Bearer mc_live_..."
```

## Activity Log

Jeder Lauf wird geloggt:
- Action: `RESEARCH_NEWS_GENERATED`
- Details: industries, contentLength, telegramSent

## Fehlerbehandlung

| Fehler | Verhalten |
|--------|----------|
| PERPLEXITY_API_KEY fehlt | 503 Service Unavailable |
| Perplexity API Fehler | 503 mit Fehlermeldung |
| Kein Projekt gefunden | Task-Erstellung übersprungen, Warnung im Log |
| Telegram nicht konfiguriert | Report übersprungen, Warnung im Log |

## Kosten

Perplexity sonar-pro: ~$5 per 1000 Requests
Bei 1x/Woche = ~$0.20/Monat
