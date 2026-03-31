/**
 * Seed-Script für ROI Demo-Daten
 * Führe aus mit: npx ts-node prisma/seed-roi-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoTasks = [
  {
    taskTitle: "API-Endpoints für Auftrags-CRUD implementieren",
    category: "code",
    agentName: "Amadeus",
    estimatedManualHours: 6,
    actualAgentMinutes: 25,
    costUsd: 0.45,
    hourlyRateSaved: 75,
    projectName: "ForstManager",
  },
  {
    taskTitle: "Prisma Schema für Tagesprotokolle erweitern",
    category: "code",
    agentName: "Amadeus",
    estimatedManualHours: 3,
    actualAgentMinutes: 12,
    costUsd: 0.22,
    hourlyRateSaved: 75,
    projectName: "ForstManager",
  },
  {
    taskTitle: "Förderprogramme Research + DB-Import",
    category: "research",
    agentName: "Amadeus",
    estimatedManualHours: 8,
    actualAgentMinutes: 45,
    costUsd: 0.85,
    hourlyRateSaved: 75,
    projectName: "SecondBrain KADB",
  },
  {
    taskTitle: "SEO-Texte für 5 Leistungsseiten schreiben",
    category: "content",
    agentName: "Quill",
    estimatedManualHours: 5,
    actualAgentMinutes: 18,
    costUsd: 0.15,
    hourlyRateSaved: 60,
    projectName: "Koch Aufforstung Website",
  },
  {
    taskTitle: "Security Audit OWASP Top 10 durchführen",
    category: "qa",
    agentName: "Argus",
    estimatedManualHours: 4,
    actualAgentMinutes: 30,
    costUsd: 0.35,
    hourlyRateSaved: 85,
    projectName: "ForstManager",
  },
  {
    taskTitle: "GitHub Actions CI/CD Pipeline einrichten",
    category: "devops",
    agentName: "Amadeus",
    estimatedManualHours: 3,
    actualAgentMinutes: 15,
    costUsd: 0.28,
    hourlyRateSaved: 75,
    projectName: "Mission Control",
  },
  {
    taskTitle: "WatermelonDB Offline-Sync implementieren",
    category: "code",
    agentName: "Nomad",
    estimatedManualHours: 10,
    actualAgentMinutes: 55,
    costUsd: 1.20,
    hourlyRateSaved: 80,
    projectName: "Koch Aufforstung App",
  },
  {
    taskTitle: "Unit Tests für Auth-System schreiben",
    category: "qa",
    agentName: "Amadeus",
    estimatedManualHours: 4,
    actualAgentMinutes: 22,
    costUsd: 0.38,
    hourlyRateSaved: 75,
    projectName: "Mission Control",
  },
  {
    taskTitle: "Wettbewerbsanalyse Field-Service-Software",
    category: "research",
    agentName: "Amadeus",
    estimatedManualHours: 6,
    actualAgentMinutes: 35,
    costUsd: 0.65,
    hourlyRateSaved: 70,
    projectName: "App-Fabrik Strategie",
  },
  {
    taskTitle: "Förderberater UI mit Tailwind redesignen",
    category: "design",
    agentName: "Pixel",
    estimatedManualHours: 4,
    actualAgentMinutes: 28,
    costUsd: 0.32,
    hourlyRateSaved: 65,
    projectName: "ForstManager",
  },
  {
    taskTitle: "PDF-Export für Rechnungen implementieren",
    category: "code",
    agentName: "Amadeus",
    estimatedManualHours: 5,
    actualAgentMinutes: 20,
    costUsd: 0.40,
    hourlyRateSaved: 75,
    projectName: "ForstManager",
  },
  {
    taskTitle: "Neon DB Backup-Strategie dokumentieren",
    category: "devops",
    agentName: "Amadeus",
    estimatedManualHours: 2,
    actualAgentMinutes: 10,
    costUsd: 0.12,
    hourlyRateSaved: 75,
    projectName: "Mission Control",
  },
  {
    taskTitle: "Multi-Tenant Auth mit NextAuth implementieren",
    category: "code",
    agentName: "Amadeus",
    estimatedManualHours: 8,
    actualAgentMinutes: 40,
    costUsd: 0.95,
    hourlyRateSaved: 85,
    projectName: "feldhub-base",
  },
  {
    taskTitle: "Case Study Koch Aufforstung schreiben",
    category: "content",
    agentName: "Quill",
    estimatedManualHours: 3,
    actualAgentMinutes: 15,
    costUsd: 0.10,
    hourlyRateSaved: 55,
    projectName: "App-Fabrik Website",
  },
  {
    taskTitle: "Stripe Connect Integration recherchieren",
    category: "research",
    agentName: "Amadeus",
    estimatedManualHours: 4,
    actualAgentMinutes: 25,
    costUsd: 0.45,
    hourlyRateSaved: 75,
    projectName: "Zipayo",
  },
];

async function main() {
  console.log("🌱 Seeding ROI Demo-Daten...");

  // Existierende Demo-Daten löschen
  await prisma.agentTaskRoi.deleteMany({});

  // Demo-Tasks über die letzten 30 Tage verteilen
  const now = new Date();
  
  for (let i = 0; i < demoTasks.length; i++) {
    const task = demoTasks[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const completedAt = new Date(now);
    completedAt.setDate(completedAt.getDate() - daysAgo);
    completedAt.setHours(8 + Math.floor(Math.random() * 10));
    completedAt.setMinutes(Math.floor(Math.random() * 60));

    const savedHours = task.estimatedManualHours - task.actualAgentMinutes / 60;

    await prisma.agentTaskRoi.create({
      data: {
        ...task,
        savedHours,
        completedAt,
      },
    });

    console.log(`✅ ${task.taskTitle}`);
  }

  console.log(`\n🎉 ${demoTasks.length} ROI Demo-Tasks erstellt!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
