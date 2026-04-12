# Mission Control — Module

## Kern-Module

### Dashboard (`/dashboard`)
- Übersicht aller aktiven Projekte
- Quick-Stats: offene Tasks, Sprints, Meilensteine
- Recent Activity Feed
- My Day / My Week Widgets

### Projekte (`/projects`)
- Projektliste mit Status, Fortschritt, Budget
- Projekt-Detail mit Tabs: Overview, Tasks, Docs, Settings
- GitHub-Repo-Integration
- Live-URL und Vercel-Deployment Links
- Budget-Tracking (€) und Stunden-Budget
- Projekt-Archivierung

### Tasks (`/tasks`, `/task-inbox`)
- Task-Inbox: Alle Tasks über Projekte hinweg
- Kanban-Board mit Drag & Drop (@dnd-kit)
- Board-Spalten konfigurierbar (WIP-Limits)
- Labels, Prioritäten, Due Dates
- Zeit-Tracking pro Task
- Subtasks (verschachtelt)
- Wiederkehrende Tasks (täglich/wöchentlich/monatlich)
- ICE-Scoring (Impact × Confidence × Ease)
- Story Points für Sprint-Planung

### Sprints (`/sprints`)
- Sprint-Planung mit Start/End-Datum
- Sprint-Goal
- Story Points (geplant vs. completed)
- Sprint-Backlog mit Task-Zuordnung
- Sprint-Status: planning → active → completed

### Team (`/team`)
- User-Management (Humans + Agents)
- Rollen: admin, human, agent
- Wochenkapazität und Stundensatz
- Skills und Tools pro Agent
- Projekt-Zuordnung via ProjectMember

### Dokumente (`/docs`, `/documents`)
- Knowledge-Base mit Markdown
- FileDoc-Uploads
- Projekt-gebundene Dokumentation
- Sharing via Public Links

### Invoices (`/invoices`)
- Rechnungserstellung mit Templates
- PDF-Export (@react-pdf/renderer)
- Status-Tracking: draft → sent → paid
- Kundenverwaltung (Clients)

### Finance (`/finance`)
- Budget-Übersicht alle Projekte
- Personalkosten-Kalkulation
- Time-Entries Auswertung
- Projekt-Kosten (ProjectCost)

### Analytics (`/analytics`)
- Task-Velocity Charts
- Sprint Burndown
- Projekt-Fortschritt über Zeit
- AI Usage Tracking

---

## Support-Module

### Activity (`/activity`)
- Activity Log aller Aktionen
- Filterbar nach Entity-Typ
- Agent-Aktivitäten tracken

### Calendar (`/calendar`)
- Events mit Task-Verknüpfung
- Deadline-Übersicht
- Meeting-Planung

### Inbox (`/inbox`)
- E-Mail-Posteingang (InboxEmail)
- Task-Erstellung aus E-Mails
- Read/Unread Status

### Notifications (`/notifications`)
- System-Benachrichtigungen
- Webhook-Events

### Settings (`/settings`)
- User-Profil
- Passwort ändern
- 2FA (TOTP mit QR-Code)
- Preferences

### Admin (`/admin`)
- User-Verwaltung
- Einladungen versenden
- System-Konfiguration
- CronJobs verwalten

### Onboarding (`/onboarding`)
- Neuer User Setup-Wizard
- Tour durch die App
- Preferences festlegen

---

## Spezial-Features

### OKRs (`/okr`)
- Objectives & Key Results
- Vierteljährliche Ziele
- Progress-Tracking

### Deals & Sales (`/deals`, `/sales`)
- CRM-Funktionen
- Deal-Pipeline
- Upselling-Tracking

### Estimator (`/estimator`)
- Aufwandsschätzung
- ROI-Kalkulation
- Quote-Generierung

### Cron Jobs (`/cronjobs`)
- Recurring Task-Generierung
- Automatische Reports
- Scheduled Jobs

### Webhooks (`/webhooks`)
- GitHub Webhook-Empfang
- Webhook-Logs
- Externe Integrationen

---

## Datenmodell-Übersicht

```
User ─────┬───── Task
          │        │
          │        ├── Sprint
          │        ├── Milestone
          │        ├── TimeEntry
          │        └── Comments
          │
          └───── Project
                   │
                   ├── Document
                   ├── Database
                   ├── Webhook
                   ├── Invoice
                   └── ProjectCost
```

---

*Erstellt: 2026-04-04 | Autor: Amadeus (Auto-Loop B)*
