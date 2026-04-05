# Mission Control

> Internes Projektmanagement-System für Feldhub / Koch Aufforstung

**Live:** https://mission-control-tawny-omega.vercel.app

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript |
| Datenbank | PostgreSQL via Prisma (Neon) |
| Hosting | Vercel (EU Frankfurt) |
| Auth | NextAuth v5 + 2FA (TOTP) |
| UI | Tailwind CSS + Radix UI |

## Features

- **Projekte:** Kanban-Board, Sprints, Milestones, Budget-Tracking
- **Tasks:** ICE-Scoring, Dependencies, Labels, Time-Tracking
- **Finanzen:** Rechnungen, Angebote, PDF-Export
- **AI-Integration:** Agent Activity Logging, Task-Suggestions
- **DSGVO:** Access-Logging, EU-Region, Rate-Limiting

## Quick Start

```bash
git clone git@github.com:tcuglewski-code/mission-control.git
cd mission-control
npm install
cp .env.example .env.local  # Credentials eintragen
npx prisma generate
npm run dev
```

## Dokumentation

| Dokument | Beschreibung |
|----------|-------------|
| [README.md](./docs/README.md) | Übersicht & Projektstruktur |
| [api.md](./docs/api.md) | API-Referenz (70+ Endpoints) |
| [auth.md](./docs/auth.md) | Authentifizierung & Sicherheit |
| [modules.md](./docs/modules.md) | App-Module im Detail |
| [database.md](./docs/database.md) | Datenbankschema (Prisma) |
| [dsgvo.md](./docs/dsgvo.md) | DSGVO-Compliance |
| [changelog.md](./docs/changelog.md) | Änderungshistorie |
| [benutzereinladung-anleitung.md](./docs/benutzereinladung-anleitung.md) | Admin: User einladen |

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL (pooled) |
| `DIRECT_URL` | Neon Direct (Migrationen) |
| `AUTH_SECRET` | NextAuth Secret |
| `RESEND_API_KEY` | E-Mail-Versand (optional) |
| `AMADEUS_TOKEN` | AI-Agent Zugriff |

## Lizenz

Proprietär — Koch Aufforstung GmbH / Feldhub

---

*Maintained by Amadeus 🎼 | Last updated: 2026-04-05*
