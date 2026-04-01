# Upselling-Trigger System (AF068)

## Übersicht

Das Upselling-Trigger System erkennt automatisch Kunden/Tenants, die für ein Upgrade in Frage kommen, und erstellt Sales-Alerts.

## Trigger-Arten

| Trigger | Schwellwert (Standard) | Vorgeschlagener Plan |
|---------|------------------------|---------------------|
| **Nutzer** | ≥5 Team-Mitglieder | Pro |
| **Tasks/Monat** | ≥100 neue Tasks | Pro |
| **API-Kosten** | ≥$20/Monat | Enterprise |
| **Feature-Requests** | ≥3 offene Tickets | Custom |

## Architektur

```
┌────────────────────┐
│  Vercel Cron       │
│  (täglich 10:00)   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ /api/cron/         │
│ upsell-check       │
└────────┬───────────┘
         │
         ├──► Prisma: Projekte + Tasks + AI-Usage analysieren
         │
         ├──► UpsellTrigger Records erstellen
         │
         └──► Telegram Alert (falls aktiviert)

┌────────────────────┐      ┌────────────────────┐
│ /api/upselling     │ ◄──► │ /admin/upselling   │
│ (REST API)         │      │ (Dashboard UI)     │
└────────────────────┘      └────────────────────┘
```

## API Endpoints

### `GET /api/upselling`
Dashboard-Daten + Config laden.

**Response:**
```json
{
  "config": { "enabled": true, "userThreshold": 5, ... },
  "stats": { "total": 12, "new": 3, "converted": 5, ... },
  "conversionRate": 62.5,
  "triggers": [...]
}
```

### `PUT /api/upselling`
Config aktualisieren (Admin only).

**Body:**
```json
{
  "enabled": true,
  "userThreshold": 10,
  "taskMonthlyThreshold": 150,
  "cooldownDays": 14
}
```

### `PATCH /api/upselling/[id]`
Trigger-Status oder Notizen aktualisieren.

**Body:**
```json
{
  "status": "contacted",
  "notes": "Telefonat am 01.04.2026, Interesse an Pro-Plan"
}
```

### `DELETE /api/upselling/[id]`
Trigger löschen (Admin only).

## Cron Job

**Pfad:** `/api/cron/upsell-check`  
**Schedule:** `0 10 * * *` (täglich 10:00 UTC = 12:00 Berlin)

### Logik:
1. Config laden (oder Default erstellen)
2. Aktive Projekte als "Tenants" durchgehen
3. Cooldown prüfen (Standard: 30 Tage zwischen Alerts)
4. Trigger auslösen wenn Schwellwerte überschritten
5. UpsellTrigger Records in DB speichern
6. Telegram Alert senden (falls aktiviert)
7. Audit Log schreiben

## Trigger-Status-Flow

```
new ──► contacted ──► converted
                 └──► dismissed
```

| Status | Bedeutung |
|--------|-----------|
| `new` | Frisch erkannt, noch nicht bearbeitet |
| `contacted` | Sales hat Kontakt aufgenommen |
| `converted` | Erfolgreich: Kunde hat Upgrade gekauft |
| `dismissed` | Kein Interesse / nicht relevant |

## Dashboard Features

- **Stats Cards:** Gesamtzahl, Neue, Kontaktiert, Konvertiert
- **Conversion Rate:** Prozent der Trigger die zu Upgrades führten
- **Filter:** Nach Status (Alle / Neu / Kontaktiert / Konvertiert / Abgelehnt)
- **Quick Actions:** Status ändern per Button-Klick
- **Notizen:** Sales-Notizen pro Trigger speichern
- **Config Modal:** Schwellwerte und Alerts konfigurieren

## Prisma Models

### UpsellConfig (Singleton)
```prisma
model UpsellConfig {
  id                    String   @id @default("singleton")
  enabled               Boolean  @default(true)
  userThreshold         Int      @default(5)
  taskMonthlyThreshold  Int      @default(100)
  apiCostThreshold      Float    @default(20.0)
  storageThreshold      Int      @default(500)
  cooldownDays          Int      @default(30)
  alertTelegram         Boolean  @default(true)
  alertEmail            Boolean  @default(false)
  alertEmails           String[] @default([])
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### UpsellTrigger
```prisma
model UpsellTrigger {
  id            String    @id @default(cuid())
  tenantId      String
  tenantName    String
  triggerType   String    // "users" | "tasks" | "api_cost" | "feature_request"
  triggerValue  Float
  threshold     Float
  suggestedPlan String    // "pro" | "enterprise" | "custom"
  message       String
  status        String    @default("new")
  priority      String    @default("medium")
  metadata      String?
  contactedAt   DateTime?
  convertedAt   DateTime?
  dismissedAt   DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## Vercel ENV

Für Telegram Alerts:
- `TELEGRAM_BOT_TOKEN` — Bot-Token
- `TELEGRAM_CHAT_ID` — Chat-ID für Alerts

## Sidebar

Link unter Administration: **🎯 Upselling** (`/admin/upselling`)

## Audit Events

- `UPSELL_CHECK_RUN` — Cron-Lauf mit Trigger-Count
- `UPSELL_TRIGGER_UPDATED` — Status/Notizen geändert
- `UPSELL_TRIGGER_DELETED` — Trigger gelöscht
