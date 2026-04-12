# Mission Control — API-Dokumentation

> **Base URL:** `https://mission-control-tawny-omega.vercel.app/api`
> **Auth:** NextAuth Session-Cookie + API Key (`x-amadeus-token` oder `mc_live_...` Key)
> **Bypass:** Header `x-vercel-bypass-automation-protection: rpFNEmGS7CB0FunapN20rLGDCG0foMzx`

---

## Auth & Benutzer

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/auth/[...nextauth]` | NextAuth Session |
| GET | `/me` | Eingeloggter User |
| GET/PUT | `/settings/profile` | Profil |
| PUT | `/settings/profile/password` | Passwort ändern |
| GET/POST | `/settings/profile/api-keys` | API-Keys verwalten |
| GET/PUT | `/settings/users` | Benutzer (Admin) |
| PUT/DELETE | `/settings/users/:id` | User bearbeiten |
| GET/POST | `/admin/users` | Benutzerverwaltung |
| GET/PUT/DELETE | `/admin/users/:id` | User-Detail |
| GET/POST | `/admin/invites` | Einladungen |
| POST | `/invite/[token]` | Einladung annehmen |
| GET/POST | `/auth/2fa/*` | 2FA (Setup, Verify, Disable, Backup-Codes) |

---

## Projekte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/projects` | Projekte auflisten |
| POST | `/projects` | Projekt erstellen |
| GET/PUT/DELETE | `/projects/:id` | Projekt-Details |
| POST | `/projects/:id/duplicate` | Duplizieren |
| POST | `/projects/:id/favorite` | Favorisieren |
| GET/POST | `/projects/:id/members` | Mitglieder |
| DELETE | `/projects/:id/members/:userId` | Mitglied entfernen |
| GET | `/projects/:id/pdf` | PDF-Export |
| GET | `/projects/:id/report` | Projektbericht |
| GET/PUT | `/projects/:id/report-schedule` | **NEU** Bericht-Zeitplan |
| GET/POST | `/projects/:id/costs` | Projektkosten |
| GET/PUT/DELETE | `/projects/:id/costs/:costId` | Kosten-Detail |
| POST | `/projects/:id/save-as-template` | Als Template speichern |
| POST | `/projects/:id/share` | Projekt teilen |
| POST | `/projects/:id/share/email` | Per E-Mail teilen |
| GET | `/projects/budgets` | Budget-Übersicht |
| PUT | `/admin/update-projects` | Batch-Update (Admin) |

---

## Tasks

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/tasks` | Tasks auflisten (Filter: project, sprint, assignee, status) |
| POST | `/tasks` | Task erstellen |
| GET/PUT/DELETE | `/tasks/:id` | Task-Detail |
| POST | `/tasks/:id/start` | Task starten (Timer) |
| GET/POST | `/tasks/:id/comments` | Kommentare |
| PUT/DELETE | `/tasks/:id/comments/:commentId` | Kommentar bearbeiten |
| POST | `/tasks/:id/labels` | Label zuweisen |
| DELETE | `/tasks/:id/labels/:labelId` | Label entfernen |
| POST | `/tasks/bulk` | Bulk-Operationen |
| POST | `/tasks/bulk-unblock` | Blockierungen aufheben |
| POST | `/tasks/csv-import` | CSV-Import |
| GET/POST | `/tasks/dependencies` | Task-Abhängigkeiten |
| GET | `/tasks/search` | Volltextsuche |
| GET | `/tasks/stream` | SSE Live-Updates |
| GET/POST | `/recurring/generate` | Wiederkehrende Tasks generieren |

---

## Sprints & Milestones

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/sprints` | Sprints |
| GET/PUT/DELETE | `/sprints/:id` | Sprint-Detail |
| POST | `/sprints/:id/start` | Sprint starten |
| POST | `/sprints/:id/complete` | Sprint abschließen |
| POST | `/sprints/:id/tasks` | Tasks hinzufügen |
| GET/POST | `/milestones` | Milestones |
| GET/PUT/DELETE | `/milestones/:id` | Milestone-Detail |
| GET | `/milestones/:id/progress` | Fortschritt |

---

## Zeit & Pomodoro

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/time-entries` | Zeiteinträge |
| POST | `/time-entries/:id/stop` | Zeit stoppen |
| GET | `/time-entries/summary` | Zusammenfassung |
| GET/POST | `/pomodoro` | Pomodoro-Timer |
| GET/PUT | `/my-day/focus` | Tages-Fokus |
| GET/PUT | `/my-day/notes` | Tagesnotizen |
| GET | `/my-week` | Wochenübersicht |

---

## Finanzen (Rechnungen & Angebote)

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/invoices` | Rechnungen |
| GET/PUT/DELETE | `/invoices/:id` | Rechnung-Detail |
| POST | `/invoices/:id/dunning` | Mahnung |
| GET/POST | `/invoices/:id/payments` | Zahlungen |
| GET | `/invoices/export` | Export |
| GET | `/invoices/next-number` | Nächste Rechnungsnummer |
| POST | `/invoices/bulk-paid` | Bulk als bezahlt markieren |
| GET/POST | `/invoice-templates` | Rechnungsvorlagen |
| GET/PUT/DELETE | `/invoice-templates/:id` | Vorlage-Detail |
| GET/POST | `/quotes` | Angebote |
| GET/PUT/DELETE | `/quotes/:id` | Angebot-Detail |
| POST | `/quotes/:id/convert` | Zu Rechnung konvertieren |
| POST | `/quotes/:id/remind` | Erinnerung senden |
| GET | `/quotes/stats` | Statistiken |
| GET | `/finance/summary` | Finanzübersicht |

---

## OKR & Strategie

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/okr` | OKRs (Objectives) |
| GET/PUT/DELETE | `/okr/:id` | OKR-Detail |
| GET/POST | `/okr/:id/key-results` | Key Results |
| PUT/DELETE | `/okr/key-results/:krId` | KR bearbeiten |

---

## Clients / Kunden

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET/POST | `/clients` | Kunden |
| GET/PUT/DELETE | `/clients/:id` | Kunden-Detail |
| GET | `/clients/:id/activity` | Aktivitätslog |
| GET | `/clients/stats` | Statistiken |

---

## AI-Features

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/ai/task-suggestions` | KI-Aufgabenvorschläge |
| POST | `/ai/task-description` | Aufgabenbeschreibung generieren |
| POST | `/ai/sprint-tasks` | Sprint-Tasks generieren |
| POST | `/ai/project-summary` | Projektzusammenfassung |
| POST | `/ai/project-estimate` | Aufwandsschätzung |
| POST | `/ai/usage` | AI Usage loggen |
| GET | `/ai/usage/summary` | AI Kostenübersicht |

---

## Cron-Jobs

| Route | Zeitplan | Beschreibung |
|-------|---------|-------------|
| `/cron/backup` | Täglich | Datenbank-Backup |
| `/cron/invoice-reminders` | Täglich | Rechnungs-Erinnerungen |
| `/cron/overdue-check` | Täglich | Überfällige Tasks |
| `/cron/uptime` | Stündlich | Uptime-Check |
| `/cron/send-reports` | Wöchentlich | Berichte versenden |
| `/cron/seo-audit` | Wöchentlich | SEO-Audit |
| `/cron/research-news` | Täglich | News-Recherche |
| `/cron/lead-generation` | Täglich | Lead-Generierung |
| `/cron/seo-article-generator` | **NEU** Wöchentlich | KI-SEO-Artikel |
| `/cron/upsell-check` | **NEU** Täglich | Upselling-Trigger |
| `/cron/dsgvo-compliance` | **NEU** Wöchentlich | DSGVO-Compliance-Check |
| `/cron/finance-review` | **NEU** Monatlich | Finance-Review |
| `/reports/weekly` | **NEU** Wöchentlich | Weekly Project Report |

---

## Webhooks & Integrationen

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/webhooks/github` | GitHub Push-Events |
| POST | `/webhooks/email` | E-Mail-Inbox |
| POST | `/webhooks/lead` | Lead-Eingang |
| POST | `/webhooks/support` | Support-Anfragen |
| GET/POST | `/integrations` | Integrationen |
| GET/PUT | `/integrations/:type` | Spezifische Integration |
| POST | `/integrations/slack` | Slack-Nachrichten |

---

## Weitere APIs

| Pfad | Beschreibung |
|------|-------------|
| `/search` | Globale Suche |
| `/activity` + `/activity/stream` | Aktivitäts-Feed (SSE) |
| `/notifications/*` | Benachrichtigungen |
| `/documents/*` | Dokumente |
| `/databases/*` | DB-Monitoring |
| `/board-columns/*` | Kanban-Spalten |
| `/inbox/emails/*` | E-Mail-Posteingang |
| `/retrospectives/*` | Sprint-Retrospektiven |
| `/agents/*` | Agent-Heartbeat |
| `/memory/*` | Agent-Memory-Sync |
| `/loop/*` | Agent-Loop (Tasks, Logs, Settings) |
| `/live` | Live-Status SSE |
| `/monitoring` | System-Monitoring |
| `/share/[token]` | Projekt-Sharing |
| `/audit` | Audit-Log |

---

*Generiert: 2026-04-05 · Quelle: Git-Repo tcuglewski-code/mission-control*
