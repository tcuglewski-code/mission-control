# Support & Ticketsystem

## Übersicht

Das Support-System ermöglicht die zentrale Verwaltung von Support-Anfragen für alle Tenants (Koch Aufforstung, AppFabrik, etc.).

## Features

- **Webhook-basiert**: Tickets können via API erstellt werden
- **E-Mail-Integration**: Support-Emails werden zu Tickets umgewandelt
- **Prioritäten**: critical / high / medium / low
- **Kategorien**: bug / feature / support / question
- **Task-Verknüpfung**: Kritische Tickets erstellen automatisch Tasks
- **Admin-Dashboard**: Ticket-Übersicht unter /admin/tickets

## Architektur

```
E-Mail (support@appfabrik.de)
     ↓
E-Mail-Provider (Mailgun / SendGrid / Zapier)
     ↓
POST /api/webhooks/support
     ↓
┌─────────────────────────────────┐
│         Mission Control         │
├─────────────────────────────────┤
│  Ticket (Prisma)                │
│  ├── title                      │
│  ├── description                │
│  ├── status (open/in_progress/  │
│  │           resolved/closed)   │
│  ├── priority (critical/high/   │
│  │             medium/low)      │
│  ├── category (bug/feature/     │
│  │             support/question)│
│  └── projectId → Support Project│
└─────────────────────────────────┘
     ↓
Admin-Benachrichtigung (Bell + optional Telegram)
```

## API-Endpunkte

### POST /api/webhooks/support

Erstellt ein neues Support-Ticket.

**Auth:** `x-api-key: MC_API_KEY` oder `x-support-secret: SUPPORT_WEBHOOK_SECRET`

**Request Body:**
```json
{
  "type": "email",
  "ticket": {
    "subject": "App stürzt ab beim Starten",
    "description": "Details zum Problem...",
    "email": "kunde@example.de",
    "name": "Max Mustermann",
    "priority": "high",
    "category": "bug",
    "tenant": "koch-aufforstung",
    "app": "mobile-app"
  },
  "createTask": false
}
```

**Response:**
```json
{
  "success": true,
  "ticketNumber": "SUP-00042",
  "ticketId": "clxyz...",
  "taskId": null,
  "projectId": "support-tickets-project",
  "message": "Support ticket SUP-00042 created"
}
```

### GET /api/tickets

Liste aller Tickets mit Filter-Optionen.

**Query-Parameter:**
- `status`: open / in_progress / resolved / closed
- `priority`: critical / high / medium / low
- `category`: bug / feature / support / question
- `projectId`: Projekt-ID
- `search`: Volltextsuche in Titel und Beschreibung
- `limit`: Max. Anzahl (default: 50)
- `offset`: Pagination-Offset

### PATCH /api/tickets/[id]

Ticket aktualisieren (Status, Priorität, Zuweisung).

```json
{
  "status": "in_progress",
  "assigneeId": "user-id-123"
}
```

## Setup

### 1. Vercel ENV-Variablen

```bash
# Generieren:
openssl rand -base64 32

# In Vercel setzen:
SUPPORT_WEBHOOK_SECRET=<generierter-wert>
MC_API_KEY=mc_live_<your-key>
```

### 2. Support-Projekt anlegen

```bash
npm run db:seed:support
```

Das Script erstellt:
- Projekt "Support & Tickets" (ID: `support-tickets-project`)
- Labels für Kategorien und Prioritäten
- Board-Spalten für Ticket-Workflow
- Demo-Ticket als Beispiel

### 3. E-Mail-Weiterleitung einrichten

**Option A: Mailgun**
1. Domain in Mailgun einrichten
2. "Routes" → "Create Route"
3. Match Expression: `match_recipient("support@appfabrik.de")`
4. Action: Forward to `https://mission-control-tawny-omega.vercel.app/api/webhooks/support`
5. Header: `x-support-secret: <SUPPORT_WEBHOOK_SECRET>`

**Option B: SendGrid Inbound Parse**
1. Settings → Inbound Parse
2. Domain: `support.appfabrik.de`
3. Destination URL: `/api/webhooks/support`
4. Custom Webhook-Handler für Parsing

**Option C: Zapier**
1. Trigger: "New Email in Mailbox"
2. Action: "Webhook" → POST to `/api/webhooks/support`
3. Body: Mapped email fields

## Ticket-Workflow

```
1. OPEN        → Ticket eingegangen, noch nicht bearbeitet
2. IN_PROGRESS → Jemand arbeitet daran
3. RESOLVED    → Lösung gefunden, wartet auf Bestätigung
4. CLOSED      → Abgeschlossen (mit oder ohne Lösung)
```

## Admin-Dashboard

Unter `/admin/tickets` (nur für Admins):

- Statistiken: Offene / In Bearbeitung / Gelöst / Kritisch
- Filter nach Status, Priorität, Suche
- Ticket-Details mit Beschreibung
- Status direkt ändern
- Neues Ticket manuell erstellen

## Best Practices

1. **Kritische Tickets** erstellen automatisch Tasks für sofortige Bearbeitung
2. **Ticket-Nummern** (SUP-XXXXX) in E-Mail-Antworten für Tracking nutzen
3. **SLA**: Kritisch <4h, Hoch <24h, Mittel <72h, Niedrig <7 Tage
4. **Kategorien** konsequent nutzen für Reporting und Automatisierung
