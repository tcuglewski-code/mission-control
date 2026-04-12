# Mission Control — Dokumentation

> Internes Projektmanagement-System für Feldhub / Koch Aufforstung

## Übersicht

Mission Control ist eine Next.js 16 Webanwendung für internes Projektmanagement mit Features wie:

- **Task-Management** mit Kanban-Boards, Sprints, Milestones
- **Projektübersicht** mit Budget-Tracking, Fortschritt, Team-Zuordnung
- **Zeit-Tracking** mit Time-Entries und Billable-Stunden
- **Dokumenten-Management** und Knowledge-Base
- **AI-Agent-Integration** mit Activity-Logging
- **Invoicing** mit PDF-Generierung

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript |
| Datenbank | PostgreSQL via Prisma |
| Hosting | Vercel |
| Auth | NextAuth v5 (Credentials) |
| UI | Tailwind CSS + Radix UI |
| State | Zustand |
| Drag & Drop | @dnd-kit |
| Diagramme | ReactFlow, Recharts |
| PDF | @react-pdf/renderer |

## Deployment

- **URL:** https://mission-control-tawny-omega.vercel.app
- **Repo:** github.com/tcuglewski-code/mission-control
- **Datenbank:** Neon PostgreSQL (MissionControlDB)

## Projektstruktur

```
mission-control/
├── src/
│   ├── app/              # Next.js App Router Pages
│   │   ├── api/          # API Routes (70+ Endpoints)
│   │   ├── dashboard/    # Hauptdashboard
│   │   ├── projects/     # Projektmanagement
│   │   ├── tasks/        # Task-Inbox
│   │   ├── sprints/      # Sprint-Verwaltung
│   │   ├── team/         # Team & Agents
│   │   ├── invoices/     # Rechnungswesen
│   │   └── ...
│   ├── components/       # React Components
│   └── lib/              # Utilities, Prisma Client
├── prisma/
│   └── schema.prisma     # Datenbank-Schema
├── auth.ts               # NextAuth Konfiguration
└── middleware.ts         # Auth + Rate-Limiting
```

## Weiterführende Dokumentation

- [modules.md](./modules.md) — App-Module im Detail
- [api.md](./api.md) — API-Referenz
- [auth.md](./auth.md) — Authentifizierung & Sicherheit

## Quick Start (Entwicklung)

```bash
git clone git@github.com:tcuglewski-code/mission-control.git
cd mission-control
npm install
cp .env.example .env.local  # Credentials eintragen
npx prisma generate
npx prisma db push
npm run dev
```

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL Connection String (pooled) |
| `DIRECT_URL` | Neon Direct Connection (für Migrationen) |
| `AUTH_SECRET` | NextAuth Secret |
| `RESEND_API_KEY` | E-Mail-Versand (optional) |
| `AMADEUS_TOKEN` | Token für AI-Agent-Zugriff |

---

*Erstellt: 2026-04-04 | Autor: Amadeus (Auto-Loop B)*
