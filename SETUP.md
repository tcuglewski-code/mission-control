# Mission Control — Setup Guide

## 🎯 Was wurde gebaut

**Mission Control** ist eine vollständige AI-gestützte Dashboard-App, ähnlich Linear/Notion, aber AI-First. Gebaut mit Next.js 14 App Router, TypeScript (strict), Tailwind CSS, Prisma + SQLite und @dnd-kit für Drag & Drop.

### Implementierte Features

| Feature | Status | Details |
|---------|--------|---------|
| **Dashboard** | ✅ | 4 Stats-Cards, Activity Timeline, Active Projects |
| **Kanban Board** | ✅ | 4 Spalten, Drag & Drop (@dnd-kit), Task Create/Edit/Delete |
| **Calendar** | ✅ | Wochenansicht, Recurring Events Sektion, Farbkodierung |
| **Projects** | ✅ | 3-Spalten Grid, Filter, Progress Bar, Member Avatare |
| **Project Detail** | ✅ | Tasks, Docs, Team, Activity Timeline |
| **Memory System** | ✅ | CRUD, Kategorien, Tags, Suchfunktion |
| **Docs System** | ✅ | CRUD, Typen, Projekt-Zuordnung, Markdown-Editor |
| **Team/Agents** | ✅ | Human/AI Agent Trennung, CRUD |
| **Tools** | ✅ | Status-Toggle, Typen-Filter, CRUD |
| **API Routes** | ✅ | 10 vollständige REST APIs (GET/POST/PUT/DELETE) |
| **Activity Logging** | ✅ | Automatisch bei allen wichtigen Aktionen |
| **Dark Mode Design** | ✅ | Linear-inspiriert, #0f0f0f Hintergrund |
| **Mobile Responsive** | ✅ | Sidebar als Overlay auf Mobile |
| **Seed Data** | ✅ | 2 User, 3 Projekte, 10 Tasks, 6 Events, 5 Tools |

### Seiten & Routes

```
/ → redirect to /dashboard
/dashboard          - System Overview mit Stats & Activity
/tasks              - Kanban Board mit Drag & Drop
/calendar           - Wochenkalender mit Events
/projects           - Projekte-Grid mit Filter
/projects/[id]      - Projekt-Detailseite
/memory             - Memory/Wissens-Datenbank
/docs               - Dokumenten-System
/team               - Team & AI Agents
/tools              - Tools & Integrationen

API:
/api/projects       GET, POST
/api/projects/[id]  GET, PUT, DELETE
/api/tasks          GET, POST
/api/tasks/[id]     GET, PUT, DELETE
/api/events         GET, POST, PUT, DELETE
/api/memory         GET, POST, PUT, DELETE
/api/docs           GET, POST, PUT, DELETE
/api/team           GET, POST, PUT, DELETE
/api/tools          GET, POST, PUT, DELETE
/api/activity       GET, POST
```

---

## 🚀 Local Development

### Voraussetzungen
- Node.js 18+
- npm

### Setup

```bash
cd /data/.openclaw/workspace/mission-control

# 1. Dependencies installieren
npm install

# 2. Prisma Client generieren
npx prisma generate

# 3. Datenbank erstellen (SQLite)
npx prisma db push

# 4. Seed-Daten laden
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

# 5. Development Server starten
npm run dev
```

App läuft auf: **http://localhost:3000**

### Nützliche Befehle

```bash
npm run dev          # Dev-Server mit Hot-Reload
npm run build        # Production Build
npm run start        # Production Server
npx prisma studio    # Datenbank GUI (http://localhost:5555)
npx prisma db push   # Schema-Änderungen anwenden
```

---

## ☁️ Vercel Deployment

### 1. GitHub Repo erstellen

```bash
cd /data/.openclaw/workspace/mission-control
git init
git add .
git commit -m "feat: initial Mission Control implementation"
git remote add origin https://github.com/tcuglewski-code/mission-control.git
git push -u origin main
```

### 2. Neon.tech PostgreSQL (kostenlos)

1. Account auf https://neon.tech erstellen (kostenlos)
2. Neues Projekt erstellen → Connection String kopieren
3. Connection String Format: `postgresql://user:password@host/dbname?sslmode=require`

### 3. Vercel Setup

1. https://vercel.com → "New Project" → GitHub Repo importieren
2. **Environment Variables** setzen:
   ```
   DATABASE_URL = postgresql://user:password@ep-xxxx.neon.tech/mission-control?sslmode=require
   NEXT_PUBLIC_APP_NAME = Mission Control
   ```
3. **Build & Output Settings** (automatisch erkannt):
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Post-Deploy**: Schema & Seed über Vercel CLI oder lokales Script mit Production DB URL:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma db push
   DATABASE_URL="postgresql://..." npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
   ```

### 4. Prisma für PostgreSQL umstellen

In `prisma/schema.prisma` ändern:
```prisma
datasource db {
  provider = "postgresql"  # war: "sqlite"
  url      = env("DATABASE_URL")
}
```

Dann:
```bash
npx prisma generate
npx prisma db push
```

---

## 🗄️ Production Database Empfehlung

### Neon.tech (empfohlen, kostenlos)
- **URL**: https://neon.tech
- **Free Tier**: 512 MB Storage, Serverless PostgreSQL
- **Vorteile**: Serverless Auto-Scaling, Branching, direkte Vercel-Integration
- **Connection Pooling**: PgBouncer eingebaut

### Alternativen
| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Neon.tech** | 512 MB | Beste Vercel-Integration |
| **Supabase** | 500 MB | Auth + Storage inklusive |
| **PlanetScale** | 5 GB | MySQL-kompatibel |
| **Railway** | $5 Credit | Einfaches Setup |

---

## 📁 Projektstruktur

```
mission-control/
├── prisma/
│   ├── schema.prisma       # Datenbankschema (SQLite/PostgreSQL)
│   └── seed.ts             # Seed-Daten
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── dashboard/      # System Dashboard
│   │   ├── tasks/          # Kanban Board
│   │   ├── calendar/       # Kalender
│   │   ├── projects/       # Projekte (List + Detail)
│   │   ├── memory/         # Memory System
│   │   ├── docs/           # Dokumentation
│   │   ├── team/           # Team & Agents
│   │   ├── tools/          # Tools
│   │   └── api/            # REST API Routes
│   ├── components/         # React Komponenten
│   │   ├── layout/         # AppShell, Sidebar, Header
│   │   ├── dashboard/      # StatsRow, RecentActivity, ActiveProjects
│   │   ├── tasks/          # KanbanBoard, KanbanColumn, TaskCard, TaskModal
│   │   ├── projects/       # ProjectCard, ProjectModal
│   │   ├── calendar/       # CalendarView
│   │   ├── memory/         # MemoryCard
│   │   ├── docs/           # DocCard
│   │   └── team/           # AgentCard
│   ├── lib/
│   │   ├── prisma.ts       # Prisma Client Singleton
│   │   └── utils.ts        # Hilfsfunktionen
│   └── store/
│       └── useAppStore.ts  # Zustand State Management
├── .env                    # Lokale Umgebungsvariablen
└── .env.example            # Template für neue Instanzen
```

---

## 🔮 Nächste Schritte

1. **Auth hinzufügen**: Clerk oder NextAuth.js einbinden
2. **Real-time**: WebSockets für Live-Updates (Pusher/Ably)
3. **AI Integration**: Task-Vorschläge, automatische Priorisierung
4. **Notifications**: Email/Telegram bei Fälligkeiten
5. **Export**: CSV/PDF Export für Reports
6. **Mobile App**: React Native Companion-App
