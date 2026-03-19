import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Users
  const tomek = await prisma.user.upsert({
    where: { email: "tomek@mission-control.ai" },
    update: {},
    create: {
      name: "Tomek",
      email: "tomek@mission-control.ai",
      role: "human",
      avatar: "T",
    },
  });

  const amadeus = await prisma.user.upsert({
    where: { email: "amadeus@mission-control.ai" },
    update: {},
    create: {
      name: "Amadeus",
      email: "amadeus@mission-control.ai",
      role: "agent",
      avatar: "A",
    },
  });

  console.log("✅ Users created");

  // Projects
  const project1 = await prisma.project.create({
    data: {
      name: "Koch Aufforstung Website",
      description: "Unternehmenswebsite mit Fördermittel-Wizard, Kundenportal und Admin-Bereich für Koch Aufforstung GmbH",
      status: "active",
      progress: 75,
      priority: "high",
      color: "#10b981",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Mission Control",
      description: "Zentrale Dashboard-App für AI-gestützte Projektsteuerung — ähnlich Linear/Notion, aber AI-First",
      status: "active",
      progress: 20,
      priority: "high",
      color: "#3b82f6",
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Mitarbeiter-App für Außeneinsätze mit Offline-Unterstützung, GPS-Tracking und Dokumentation",
      status: "planning",
      progress: 0,
      priority: "medium",
      color: "#8b5cf6",
    },
  });

  console.log("✅ Projects created");

  // Project Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: tomek.id, role: "owner" },
      { projectId: project1.id, userId: amadeus.id, role: "agent" },
      { projectId: project2.id, userId: tomek.id, role: "owner" },
      { projectId: project2.id, userId: amadeus.id, role: "agent" },
      { projectId: project3.id, userId: tomek.id, role: "owner" },
    ],
  });

  console.log("✅ Project members created");

  // Tasks
  const task1 = await prisma.task.create({
    data: {
      title: "Fördermittel-Wizard implementieren",
      description: "Mehrschrittiger Wizard für Waldbesitzer zur Fördermittelberatung",
      status: "done",
      priority: "high",
      labels: "frontend,wizard",
      projectId: project1.id,
      assigneeId: amadeus.id,
      dueDate: new Date("2026-02-28"),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Kundenportal Backend API",
      description: "REST API für Auftrags- und Dokumentenverwaltung im Kundenportal",
      status: "in_progress",
      priority: "high",
      labels: "backend,api",
      projectId: project1.id,
      assigneeId: amadeus.id,
      dueDate: new Date("2026-03-25"),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "UI-Komponenten Library aufbauen",
      description: "Wiederverwendbare Komponenten nach Brand Guidelines erstellen",
      status: "in_review",
      priority: "medium",
      labels: "design,frontend",
      projectId: project1.id,
      assigneeId: amadeus.id,
      dueDate: new Date("2026-03-20"),
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "SEO-Optimierung Homepage",
      description: "Meta-Tags, Schema.org, Sitemap und Performance-Optimierung",
      status: "backlog",
      priority: "medium",
      labels: "seo,marketing",
      projectId: project1.id,
      assigneeId: tomek.id,
      dueDate: new Date("2026-04-10"),
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Mission Control Kanban Board",
      description: "Drag & Drop Kanban mit @dnd-kit implementieren",
      status: "done",
      priority: "high",
      labels: "frontend,ui",
      projectId: project2.id,
      assigneeId: amadeus.id,
    },
  });

  const task6 = await prisma.task.create({
    data: {
      title: "Datenbankschema + Prisma Setup",
      description: "SQLite für Entwicklung, PostgreSQL-kompatibles Schema",
      status: "in_progress",
      priority: "high",
      labels: "backend,db",
      projectId: project2.id,
      assigneeId: amadeus.id,
      dueDate: new Date("2026-03-18"),
    },
  });

  const task7 = await prisma.task.create({
    data: {
      title: "Mobile App Architektur planen",
      description: "Tech Stack evaluieren: Expo + React Native + WatermelonDB",
      status: "backlog",
      priority: "high",
      labels: "planning,mobile",
      projectId: project3.id,
      assigneeId: tomek.id,
      dueDate: new Date("2026-04-01"),
    },
  });

  const task8 = await prisma.task.create({
    data: {
      title: "Offline-Sync Strategie definieren",
      description: "WatermelonDB Sync-Protokoll mit Backend API",
      status: "backlog",
      priority: "medium",
      labels: "architecture,mobile",
      projectId: project3.id,
      assigneeId: amadeus.id,
    },
  });

  const task9 = await prisma.task.create({
    data: {
      title: "DSGVO Compliance Review",
      description: "Datenschutz-Audit für alle Systeme",
      status: "in_review",
      priority: "high",
      labels: "legal,security",
      assigneeId: tomek.id,
      dueDate: new Date("2026-03-31"),
    },
  });

  const task10 = await prisma.task.create({
    data: {
      title: "Deployment Pipeline aufsetzen",
      description: "CI/CD mit GitHub Actions, automatisches Deployment auf Hostinger",
      status: "backlog",
      priority: "medium",
      labels: "devops",
      projectId: project1.id,
      assigneeId: amadeus.id,
    },
  });

  console.log("✅ Tasks created");

  // Calendar Events
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday

  await prisma.event.createMany({
    data: [
      {
        title: "Sprint Planning",
        description: "Wochentliche Sprint-Planung mit Tomek",
        type: "meeting",
        color: "#3b82f6",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 10, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 11, 0),
        recurring: "weekly",
      },
      {
        title: "Deployment: Koch Website v2.1",
        description: "Fördermittel-Wizard Live-Schaltung",
        type: "deployment",
        color: "#10b981",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 14, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 15, 0),
      },
      {
        title: "Crawl4AI Sitemap Update",
        description: "Automatischer Website-Crawl für Dokumentation",
        type: "cron",
        color: "#f97316",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 3, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 3, 30),
        recurring: "daily",
      },
      {
        title: "DSGVO Review Deadline",
        description: "Alle Systeme müssen compliance-ready sein",
        type: "reminder",
        color: "#8b5cf6",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 9, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 10, 0),
        taskId: task9.id,
      },
      {
        title: "API Review: Kundenportal",
        description: "Code Review der Backend-API Endpunkte",
        type: "meeting",
        color: "#3b82f6",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 15, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 16, 0),
      },
      {
        title: "DB Backup",
        description: "Automatisches tägliches Datenbankbackup",
        type: "cron",
        color: "#f97316",
        startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 2, 0),
        endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 2, 15),
        recurring: "daily",
      },
    ],
  });

  console.log("✅ Events created");

  // Memory Entries
  await prisma.memoryEntry.createMany({
    data: [
      {
        title: "WordPress Admin Zugangsdaten",
        content: "Admin-URL: peru-otter-113714.hostingersite.com/wp-admin\nUser: openclaw\nDatenbank: MySQL über phpMyAdmin",
        category: "credentials",
        tags: "wordpress,hosting,admin",
        source: "TOOLS.md",
        projectId: project1.id,
      },
      {
        title: "Fördermittel-Wizard: Entscheidungslogik",
        content: "Der Wizard prüft: 1) Bundesland, 2) Waldgröße (ha), 3) Waldtyp (Laub/Nadel/Misch), 4) Schadensursache, 5) Vorerfahrung. Je nach Kombination werden Bundes- und Länderprogramme empfohlen.",
        category: "architecture",
        tags: "wizard,foerderung,logik",
        projectId: project1.id,
      },
      {
        title: "AI Agent Koordination",
        content: "Amadeus koordiniert: UX/UI Designer, Copywriter/SEO, Frontend Dev, WP Backend Dev, QA/Security, Datenbank/API Architekt, App Developer. Jeder Agent hat ein eigenes Verzeichnis unter /agents/.",
        category: "architecture",
        tags: "agents,koordination,amadeus",
      },
      {
        title: "Tech Stack Entscheidungen",
        content: "Mobile App: Expo + React Native + WatermelonDB (Offline-First)\nBackend: Next.js API Routes oder separater Express-Server\nDB: SQLite (dev) → PostgreSQL (prod) mit Neon.tech\nAuth: Clerk oder NextAuth (noch nicht implementiert)",
        category: "decisions",
        tags: "tech,stack,entscheidungen",
        projectId: project3.id,
      },
    ],
  });

  console.log("✅ Memory entries created");

  // Documents
  await prisma.document.createMany({
    data: [
      {
        title: "Architektur-Übersicht: Koch Aufforstung Plattform",
        content: `# Architektur-Übersicht

## Systemkomponenten

### 1. Unternehmenswebsite
- WordPress + WooCommerce auf Hostinger
- Custom Theme nach Brand Guidelines
- Fördermittel-Wizard als Custom Plugin

### 2. Kundenportal
- Next.js App mit Authentifizierung
- Auftragsübersicht, Dokumentenverwaltung
- Rechnungen und Zahlungsstatus

### 3. Admin-Bereich
- Internes Dashboard für Büro-Mitarbeiter
- Auftragsmanagement, Teamplanung
- Berichterstellung

### 4. Mobile App
- React Native + Expo
- WatermelonDB für Offline-Sync
- GPS-Tracking, Foto-Dokumentation

## Datenfluss
Website → API → Datenbank → Portal/Admin/App

## Deployment
- Website: Hostinger (WordPress)
- Portal/API: Vercel oder Hetzner VPS
- DB: PostgreSQL auf Neon.tech
`,
        type: "architecture",
        tags: "architektur,overview,platform",
        projectId: project1.id,
        version: 2,
      },
      {
        title: "Mission Control: Feature-Roadmap",
        content: `# Mission Control Roadmap

## v0.1 - MVP (aktuell)
- [x] Dashboard mit Stats & Activity
- [x] Kanban Board mit Drag & Drop
- [x] Projekte mit Progress-Tracking
- [x] Kalender-Ansicht
- [x] Memory System
- [x] Docs System
- [x] Team-Verwaltung
- [x] Tools-Übersicht

## v0.2 - AI Features
- [ ] AI-gestützte Task-Erstellung
- [ ] Automatische Prioritäts-Vorschläge
- [ ] Smart Deadlines basierend auf Workload

## v0.3 - Collaboration
- [ ] Multi-User Auth
- [ ] Real-time Updates (WebSockets)
- [ ] Kommentar-System ausbauen

## v1.0 - Production
- [ ] PostgreSQL Migration
- [ ] Backup & Recovery
- [ ] Audit Logging
`,
        type: "doc",
        tags: "roadmap,features,planning",
        projectId: project2.id,
        version: 1,
      },
      {
        title: "API-Vertrag: Kundenportal ↔ Backend",
        content: `# API-Vertrag

## Authentifizierung
- JWT Bearer Token
- Refresh Token mit 30-Tage Gültigkeit

## Endpoints

### Aufträge
- GET /api/orders - Liste aller Aufträge des Kunden
- GET /api/orders/:id - Einzelner Auftrag mit Details
- POST /api/orders - Neuen Auftrag erstellen
- PUT /api/orders/:id/status - Status aktualisieren

### Dokumente
- GET /api/documents - Alle Dokumente
- GET /api/documents/:id - Einzelnes Dokument (inkl. Download-URL)
- POST /api/documents - Dokument hochladen

### Rechnungen
- GET /api/invoices - Alle Rechnungen
- GET /api/invoices/:id - PDF-Download

## Fehlerformat
\`\`\`json
{
  "error": "string",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`
`,
        type: "api",
        tags: "api,contract,backend",
        projectId: project1.id,
        version: 1,
      },
    ],
  });

  console.log("✅ Documents created");

  // Tools
  await prisma.tool.createMany({
    data: [
      {
        name: "Crawl4AI",
        description: "Web-Crawler für automatische Inhaltsextraktion und Dokumentation. Unterstützt JavaScript-Rendering, PDF-Extraktion und strukturierte Daten.",
        type: "library",
        status: "active",
        config: JSON.stringify({ version: "0.8.0", language: "python" }),
        projectIds: `${project1.id},${project2.id}`,
      },
      {
        name: "PostgreSQL + pgvector",
        description: "Produktionsdatenbank mit Vektorsuche für AI-Embeddings. Auf Neon.tech gehostet (serverless, automatisches Scaling).",
        type: "database",
        status: "active",
        config: JSON.stringify({ host: "postgresql-osfg-postgresql-1", port: 5432 }),
        projectIds: `${project1.id}`,
      },
      {
        name: "Perplexity API",
        description: "AI-gestützte Websuche für Recherche und Fördermittel-Updates. Modelle: sonar-pro-search (schnell) und sonar-deep-research (tiefgehend).",
        type: "api",
        status: "active",
        config: JSON.stringify({ model: "perplexity/sonar-pro-search" }),
        projectIds: `${project1.id},${project2.id}`,
      },
      {
        name: "GitHub",
        description: "Versionskontrolle und CI/CD Pipeline. Automatisches Deployment bei Push auf main Branch.",
        type: "vcs",
        status: "active",
        config: JSON.stringify({ user: "tcuglewski-code", repo: "mission-control" }),
        projectIds: `${project1.id},${project2.id},${project3.id}`,
      },
      {
        name: "Hostinger",
        description: "WordPress-Hosting für Koch Aufforstung Website. SSH-Zugang für direktes Deployment. WP-CLI verfügbar.",
        type: "hosting",
        status: "active",
        config: JSON.stringify({ host: "82.198.227.185", port: 65002, user: "u142409877" }),
        projectIds: `${project1.id}`,
      },
    ],
  });

  console.log("✅ Tools created");

  // Databases
  await prisma.database.createMany({
    data: [
      {
        name: "Mission Control DB",
        type: "neon",
        host: "ep-proud-forest-xxxx.eu-central-1.aws.neon.tech",
        port: 5432,
        status: "connected",
        sizeBytes: BigInt(134217728), // 128 MB
        projectId: project2.id,
        lastChecked: new Date(),
      },
      {
        name: "Koch Aufforstung MySQL",
        type: "mysql",
        host: "sql.hostingersite.com",
        port: 3306,
        status: "connected",
        sizeBytes: BigInt(52428800), // 50 MB
        lastBackup: new Date(Date.now() - 1000 * 60 * 60 * 24), // yesterday
        projectId: project1.id,
        lastChecked: new Date(),
      },
      {
        name: "Mobile App Local DB",
        type: "watermelondb",
        host: null,
        port: null,
        status: "connected",
        sizeBytes: BigInt(8388608), // 8 MB
        projectId: project3.id,
        lastChecked: new Date(),
      },
    ],
  });

  console.log("✅ Databases created");

  // Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        action: "created",
        entityType: "project",
        entityId: project1.id,
        entityName: "Koch Aufforstung Website",
        userId: tomek.id,
        projectId: project1.id,
        metadata: JSON.stringify({ priority: "high" }),
      },
      {
        action: "completed",
        entityType: "task",
        entityId: task1.id,
        entityName: "Fördermittel-Wizard implementieren",
        userId: amadeus.id,
        projectId: project1.id,
      },
      {
        action: "created",
        entityType: "project",
        entityId: project2.id,
        entityName: "Mission Control",
        userId: tomek.id,
        projectId: project2.id,
      },
      {
        action: "updated",
        entityType: "task",
        entityId: task2.id,
        entityName: "Kundenportal Backend API",
        userId: amadeus.id,
        projectId: project1.id,
        metadata: JSON.stringify({ field: "status", from: "backlog", to: "in_progress" }),
      },
      {
        action: "created",
        entityType: "document",
        entityId: "doc1",
        entityName: "Architektur-Übersicht: Koch Aufforstung Plattform",
        userId: amadeus.id,
        projectId: project1.id,
      },
      {
        action: "created",
        entityType: "task",
        entityId: task7.id,
        entityName: "Mobile App Architektur planen",
        userId: tomek.id,
        projectId: project3.id,
      },
      {
        action: "updated",
        entityType: "project",
        entityId: project1.id,
        entityName: "Koch Aufforstung Website",
        userId: amadeus.id,
        projectId: project1.id,
        metadata: JSON.stringify({ field: "progress", from: 60, to: 75 }),
      },
      {
        action: "created",
        entityType: "memory",
        entityId: "mem1",
        entityName: "AI Agent Koordination",
        userId: amadeus.id,
      },
      {
        action: "review",
        entityType: "task",
        entityId: task3.id,
        entityName: "UI-Komponenten Library aufbauen",
        userId: amadeus.id,
        projectId: project1.id,
        metadata: JSON.stringify({ field: "status", from: "in_progress", to: "in_review" }),
      },
      {
        action: "created",
        entityType: "tool",
        entityId: "tool1",
        entityName: "Crawl4AI",
        userId: amadeus.id,
      },
    ],
  });

  console.log("✅ Activity logs created");
  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
