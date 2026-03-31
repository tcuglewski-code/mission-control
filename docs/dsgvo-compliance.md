# Lexos-Agent: DSGVO Compliance Monitor (AF071)

Automatisierter wöchentlicher DSGVO-Compliance-Check für alle Tenant-Websites.

## Features

- **Wöchentlicher Scan** — Jeden Montag 10:00 UTC
- **Impressum-Check** — Prüft `/impressum`, `/imprint`, `/legal`, `/legal-notice`
- **Datenschutz-Check** — Prüft `/datenschutz`, `/privacy`, `/privacy-policy`
- **Cookie-Banner-Check** — Erkennt bekannte Cookie-Consent-Tools
- **Telegram-Alerts** — Benachrichtigung bei Compliance-Problemen
- **Audit-Log** — Alle Checks werden in ActivityLog protokolliert

## API Endpoint

```
GET/POST /api/cron/dsgvo-compliance
```

### Authentication

- Header: `Authorization: Bearer <CRON_SECRET>`
- Alternativ: `x-vercel-cron-secret` (Vercel intern)

### Response

```json
{
  "success": true,
  "timestamp": "2026-03-31T10:00:00.000Z",
  "summary": {
    "tenantsChecked": 3,
    "compliant": 2,
    "nonCompliant": 1,
    "complianceRate": 67
  },
  "alertSent": true,
  "results": [
    {
      "tenantId": "ka-website",
      "tenantName": "Koch Aufforstung Website",
      "url": "https://peru-otter-113714.hostingersite.com",
      "compliant": true,
      "issues": [],
      "details": {
        "impressum": { "found": true, "path": "/impressum" },
        "privacy": { "found": true, "path": "/datenschutz" },
        "cookieBanner": { "found": true, "indicator": "complianz" }
      }
    }
  ]
}
```

## Geprüfte Elemente

### 1. Impressum

Gesetzliche Pflicht nach § 5 TMG. Der Agent prüft folgende Pfade:
- `/impressum`
- `/imprint`
- `/legal`
- `/legal-notice`

### 2. Datenschutzerklärung

Pflicht nach Art. 13/14 DSGVO. Geprüfte Pfade:
- `/datenschutz`
- `/privacy`
- `/privacy-policy`
- `/datenschutzerklaerung`

### 3. Cookie-Banner

Pflicht nach TTDSG (§ 25) für nicht-essentielle Cookies. Erkannte Tools:
- Borlabs Cookie
- Complianz
- Real Cookie Banner
- Cookiebot
- OneTrust
- Usercentrics
- und viele mehr...

## Vercel ENV Variablen

```env
# Für Telegram-Alerts (optional)
TELEGRAM_BOT_TOKEN=123456789:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890

# Cron-Auth (erforderlich)
CRON_SECRET=your-secret-here
```

## Cron Schedule

```json
{
  "path": "/api/cron/dsgvo-compliance",
  "schedule": "0 10 * * 1"
}
```

= Jeden Montag um 10:00 UTC (12:00 Berlin Sommerzeit)

## Manueller Test

```bash
curl -X POST https://mission-control-tawny-omega.vercel.app/api/cron/dsgvo-compliance \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Tenant-Konfiguration

Die Tenant-Liste wird aus `MonitoringConfig` geladen (gleiche Quelle wie Uptime-Monitor).

Neue Tenants hinzufügen:
1. Admin → Monitoring → "Tenant hinzufügen"
2. Oder via API: `POST /api/monitoring` mit `{ tenantId, tenantName, url }`

## Bekannte Limitierungen

1. **SPA-Websites**: Cookie-Banner die erst per JavaScript geladen werden, werden möglicherweise nicht erkannt
2. **Custom-Pfade**: Impressum/Datenschutz unter ungewöhnlichen URLs wird nicht gefunden
3. **Login-geschützte Apps**: ForstManager etc. zeigen auf der Startseite keinen Cookie-Banner (Login-Flow)

## Audit-Log

Alle Checks werden im ActivityLog gespeichert:

```
action: DSGVO_COMPLIANCE_CHECK
entityType: system
entityId: lexos-agent
metadata: { tenantsChecked, compliantCount, nonCompliantCount, nonCompliantTenants }
```

Abrufbar via: Admin → Audit Trail

## Empfohlene Maßnahmen bei Problemen

| Problem | Lösung |
|---------|--------|
| Kein Impressum | `/impressum` Seite erstellen mit Pflichtangaben |
| Keine Datenschutzerklärung | `/datenschutz` Seite erstellen (DSGVO-konform) |
| Kein Cookie-Banner | Complianz, Borlabs Cookie oder Real Cookie Banner installieren |
