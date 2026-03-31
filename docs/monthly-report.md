# Monatlicher Kunden-Report (AF067)

## Übersicht

Der monatliche Kunden-Report wird automatisch am 1. jeden Monats um 09:00 UTC generiert. Er liefert eine Zusammenfassung über alle konfigurierten Tenants:

- **Uptime-Statistik** — Verfügbarkeit der letzten 30 Tage
- **Offene Bugs** — Tickets mit Status open/in_progress und Kategorie bug
- **Erledigte Tasks** — Anzahl der abgeschlossenen Tasks
- **API-Kosten** — LLM-Nutzungskosten (Anthropic, OpenAI)

## Konfiguration

### Vercel ENV Variablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `CRON_SECRET` | ✅ Ja | Vercel Cron-Authentifizierung |
| `TELEGRAM_BOT_TOKEN` | ✅ Empfohlen | Bot-Token von @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ Empfohlen | Ziel-Chat für Benachrichtigungen |
| `MONTHLY_REPORT_EMAIL` | Optional | Zusätzliche Email-Zustellung |
| `SMTP_*` oder `RESEND_API_KEY` | Optional | Für Email-Versand |

### Tenants hinzufügen

Tenants werden über das `MonitoringConfig`-Model verwaltet. Neue Tenants können über die Admin-UI `/admin/monitoring` hinzugefügt werden oder via Prisma:

```ts
await prisma.monitoringConfig.create({
  data: {
    tenantId: "kunde-xyz",
    tenantName: "Kunde XYZ GmbH",
    url: "https://kunde-xyz.feldhub.de",
    enabled: true,
  },
});
```

## API

### Manuell ausführen

```bash
# Via curl (mit CRON_SECRET)
curl -X POST https://mission-control-tawny-omega.vercel.app/api/cron/monthly-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Response

```json
{
  "success": true,
  "timestamp": "2026-04-01T09:00:00.000Z",
  "period": {
    "start": "01.03.2026",
    "end": "31.03.2026"
  },
  "tenantsProcessed": 3,
  "reports": [
    {
      "tenantId": "mission-control",
      "tenantName": "Mission Control",
      "uptimePercent": 99.95,
      "openBugs": 2,
      "activities": 45,
      "tasksCompleted": 28
    }
  ],
  "telegram": { "success": true },
  "email": { "success": false, "error": "Email nicht konfiguriert" }
}
```

## Telegram-Format

```
📊 Monatlicher Feldhub-Report
📅 März 2026

🌐 Gesamt-Übersicht
├ Tenants: 3
├ Ø Uptime: 99.82%
├ Offene Bugs: 5
├ Tasks erledigt: 87
└ API-Kosten: $12.45

📋 Details pro Tenant

*Mission Control*
├ 🟢 Uptime: 99.95%
├ 🟡 Bugs: 2
├ 📈 Aktivitäten: 45
└ ✅ Tasks: 28

*ForstManager*
├ 🟢 Uptime: 99.90%
├ 🟢 Bugs: 0
├ 📈 Aktivitäten: 32
└ ✅ Tasks: 42
   📦 Features: Gantt-Ansicht, Bulk-Export

─────────────────
🤖 Automatisch generiert von Amadeus
📅 01.04.2026 09:00
```

## Cron-Schedule

- **Route:** `/api/cron/monthly-report`
- **Schedule:** `0 9 1 * *` (1. jeden Monats, 09:00 UTC)
- **Timezone:** UTC (10:00/11:00 Uhr Berlin je nach Sommer-/Winterzeit)

## Audit-Trail

Jede Report-Generierung wird im ActivityLog protokolliert:

```json
{
  "action": "MONTHLY_REPORT_GENERATED",
  "entityType": "report",
  "entityId": "monthly",
  "details": {
    "tenantsCount": 3,
    "telegramSent": true,
    "emailSent": false
  }
}
```

## Fehlerbehandlung

| Situation | Verhalten |
|-----------|-----------|
| Keine Tenants konfiguriert | Report wird übersprungen, Info-Meldung |
| Telegram nicht konfiguriert | Report nur per Email (falls konfiguriert) |
| Email nicht konfiguriert | Report nur per Telegram |
| Beide nicht konfiguriert | Report wird generiert + geloggt, aber nicht versendet |
| Tenant-URL nicht erreichbar | Uptime wird als < 100% berechnet |

## Siehe auch

- [Uptime Monitoring](/admin/monitoring)
- [Ticket-System](/admin/tickets)
- [AI Usage Dashboard](/ai-usage)
