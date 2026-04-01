# Cleo-Agent: Kunden-Onboarding System (AF083)

Automatisiertes Tracking und Erinnerungen für Kunden-Onboardings.

## Features

- **Täglicher Check** — Täglich 08:00 UTC prüft offene Onboardings
- **Fortschritts-Tracking** — 4-Wochen-Plan mit 13 Checkpoints
- **Automatische Wochenwechsel** — Woche erhöht sich automatisch wenn alle Checkpoints erledigt
- **Stale-Detection** — Alert wenn kein Fortschritt seit X Tagen
- **Überfälligkeits-Alert** — Warnung wenn Go-Live-Termin überschritten
- **Cooldown** — Keine Alert-Spam (min. 3 Tage zwischen Erinnerungen)
- **Telegram-Alerts** — Benachrichtigung bei Problemen

## Cron Schedule

```json
{
  "path": "/api/cron/onboarding-check",
  "schedule": "0 8 * * *"
}
```

= Täglich um 08:00 UTC (10:00 Berlin Sommerzeit)

## Onboarding-Phasen

### Woche 1: Kickoff
- [ ] Kickoff-Meeting
- [ ] Anforderungs-Workshop
- [ ] Konfigurationsplan

### Woche 2: Setup
- [ ] Domain eingerichtet
- [ ] Datenbank angelegt
- [ ] App-Setup
- [ ] Datenimport

### Woche 3: Training
- [ ] Admin-Schulung
- [ ] Mitarbeiter-Schulung
- [ ] Testbetrieb

### Woche 4: Go-Live
- [ ] Finaler Check
- [ ] Go-Live
- [ ] Support-Übergabe

### Zusätzliche Checkpoints
- [ ] Vertrag unterschrieben
- [ ] AVV unterzeichnet
- [ ] Erste Zahlung eingegangen

## API Endpoints

### Liste aller Onboardings
```
GET /api/customer-onboarding
```

### Neues Onboarding erstellen
```
POST /api/customer-onboarding
Content-Type: application/json

{
  "tenantId": "mueller-garten",
  "tenantName": "Müller Garten- und Landschaftsbau",
  "contactName": "Max Müller",
  "contactEmail": "max@mueller-garten.de",
  "targetGoLive": "2026-05-01"
}
```

### Onboarding updaten (Checkpoints)
```
PATCH /api/customer-onboarding/{id}
Content-Type: application/json

{
  "w1_kickoff": true,
  "w1_requirements": true
}
```

### Onboarding löschen
```
DELETE /api/customer-onboarding/{id}
```

### Manueller Check ausführen
```
POST /api/cron/onboarding-check
Authorization: Bearer <CRON_SECRET>
```

## Prisma Models

### CustomerOnboarding
```prisma
model CustomerOnboarding {
  id              String    @id @default(cuid())
  tenantId        String    @unique
  tenantName      String
  projectId       String?
  status          String    @default("in_progress")
  week            Int       @default(1)
  startDate       DateTime  @default(now())
  targetGoLive    DateTime?
  actualGoLive    DateTime?
  // ... Checkpoints ...
  avvSigned       Boolean   @default(false)
  contractSigned  Boolean   @default(false)
  firstPayment    Boolean   @default(false)
  contactName     String?
  contactEmail    String?
  notes           String?
  lastReminderSentAt DateTime?
  reminderCount   Int       @default(0)
  ownerName       String?
}
```

### OnboardingCheckConfig
```prisma
model OnboardingCheckConfig {
  id                   String   @id @default("singleton")
  enabled              Boolean  @default(true)
  alertTelegram        Boolean  @default(true)
  alertSlack           Boolean  @default(false)
  staleDaysThreshold   Int      @default(7)
  reminderCooldownDays Int      @default(3)
}
```

## Admin-UI

Dashboard unter: `/admin/onboarding`

Features:
- Übersicht aller Onboardings
- Stats (Gesamt, In Arbeit, Abgeschlossen, Ø Fortschritt)
- Filter nach Status
- Expandierbare Cards mit Checkpoint-Checkliste
- Inline-Bearbeitung von Checkpoints
- Neues Onboarding erstellen
- Manuellen Check ausführen

## Alert-Logik

Cleo sendet Alert wenn:
1. **Offene Checkpoints** für aktuelle Woche vorhanden
2. **Stale** — Kein Update seit `staleDaysThreshold` Tagen (default: 7)
3. **Überfällig** — `targetGoLive` überschritten
4. **Vertrag fehlt** — Fortschritt >25% aber Vertrag nicht unterschrieben
5. **AVV fehlt** — Fortschritt >50% aber AVV nicht unterzeichnet

## Vercel ENV Variablen

```env
# Für Telegram-Alerts
TELEGRAM_BOT_TOKEN=123456789:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890

# Cron-Auth
CRON_SECRET=your-secret-here
```

## Audit-Log

Alle Aktionen werden im ActivityLog protokolliert:
- `ONBOARDING_CREATED`
- `ONBOARDING_UPDATED`
- `ONBOARDING_DELETED`
- `ONBOARDING_CHECK`
- `ONBOARDING_CHECK_ERROR`

## Nach Deploy

```bash
# Prisma Schema synchronisieren
prisma db push

# Oder Migration erstellen
prisma migrate dev --name add-customer-onboarding
```
