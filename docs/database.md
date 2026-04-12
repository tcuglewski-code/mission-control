# Mission Control — Datenbankschema

> **DB:** PostgreSQL (Neon) · **ORM:** Prisma Client JS
> **Zuletzt aktualisiert:** 2026-04-05

---

## Enums

```
RecurringInterval: DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
```

---

## Benutzer & Team

### User
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | CUID | PK |
| name | String | Name |
| email | String UNIQUE | E-Mail |
| role | String | `human`, `agent` |
| tools | String? | JSON-Array: Tool-Namen |
| skills | String? | JSON-Array: Skill-Namen |
| weeklyCapacity | Int | Wochenkapazität in h |
| hourlyRate | Float | Stundensatz in € |

---

## Projektmanagement

### Project
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | CUID | PK |
| name, description | String | Projekt-Info |
| longDescription | String? | Living Document |
| status | String | `active`, `archived` |
| progress | Int | 0–100% |
| priority | String | `low`, `medium`, `high` |
| githubRepo | String? | tcuglewski-code/repo |
| liveUrl, vercelUrl | String? | Deployment-URLs |
| expoProjectId | String? | EAS-Projekt-ID |
| stack | String? | Tech-Stack |
| budget | Float? | Budget in € |
| budgetUsed | Float? | Verbrauchtes Budget |
| hourBudget | Float? | Stunden-Budget |

### Task
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | CUID | PK |
| title | String | Aufgabentitel |
| status | String | `todo`, `in_progress`, `review`, `done` |
| priority | String | `low`, `medium`, `high`, `urgent` |
| dueDate, startDate | DateTime? | Termine |
| storyPoints | Int? | SP-Schätzung |
| timeSpentSeconds | Int | Gemessene Zeit |
| shortId | Int? | Kurzreferenz #NNN |
| recurring | Boolean | Wiederkehrend |
| recurringInterval | RecurringInterval? | Intervall |
| parentTaskId | String? | Subtask-Parent |
| startAfterTaskId | String? | Abhängigkeit |
| iceImpact/Confidence/Ease | Int? | ICE-Scoring (1-10) |
| iceScore | Float? | (Impact × Confidence × Ease) / 10 |

### Sprint
- id, name, goal, startDate, endDate, status
- Verknüpft mit: Project, Tasks

### Milestone
- id, name, dueDate, progress
- Verknüpft mit: Project, Tasks

### BoardColumn
- id, name, statusKey, order, wipLimit, color
- projectId (null = global)

---

## Neue Modelle (diese Woche)

### PdAccessLog *(NEU DA-29)*
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| userId | String | Zugreifender User |
| resource | String | Ressource |
| action | String | `read`, `export`, `delete` |
| createdAt | DateTime | Zeitpunkt |

### Decision *(NEU Q050)*
Archiv wichtiger Entscheidungen.
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| title | String | Entscheidungstitel |
| content | String | Details + Begründung |
| madeAt | DateTime | Entscheidungsdatum |
| madeBy | String | Entscheider |

### Risk *(NEU Q037)*
5×5 Risikomatrix.
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| title | String | Risikotitel |
| kategorie | String | Kategorie |
| wahrscheinlichkeit | Int | 1-5 |
| auswirkung | Int | 1-5 |
| score | Int | wahrscheinlichkeit × auswirkung |
| massnahme | String? | Gegenmaßnahme |

### Meeting + MeetingActionItem *(NEU Q032)*
Meeting-Notes mit Action Items.

### CustomerOnboarding *(NEU AF083)*
Kunden-Onboarding Tracker (Cleo-Agent).
- Steps, Status, Completion-Datum

### Expense *(NEU AF069)*
Betriebsausgaben für Cash-Flow Dashboard.

---

## Finanzen

### Invoice
- Rechnungen mit Positionen, Status, Mahnungen
- Verknüpft mit: Project, Client

### Quote
- Angebote mit Konvertierung zu Rechnung

### TimeEntry
- Zeiterfassungseinträge mit Start/Stop
- Verknüpft mit: User, Task, Project

### ProjectCost
- Projektspezifische Kosten

---

## Kommunikation

### InboxEmail
- Eingehende E-Mails, automatische Task-Erstellung
- preview (max. 200 Zeichen)

### Label / TaskLabel
- Labels für Tasks (many-to-many)

### TaskComment
- Kommentare auf Tasks mit Reaktionen

### Notification
- System-Benachrichtigungen mit SSE-Stream

---

## Integrationen

### Webhook
- Ausgehende Webhooks pro Projekt
- Events: push, deploy, etc.

### Integration
- Slack, GitHub, E-Mail etc.
- type, config (JSON), aktiv

---

*Generiert: 2026-04-05 · Quelle: prisma/schema.prisma tcuglewski-code/mission-control*
