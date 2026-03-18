const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.cronJob.deleteMany();

  await prisma.cronJob.createMany({
    data: [
      {
        name: "Tägliche Projekt-Review",
        description: "Prüft alle aktiven Projekte und schlägt neue Tasks vor (Inhalte, Visuals, Funktionen, Business-Ideen). Ergebnisse werden an Tomek via Telegram gesendet.",
        schedule: "0 19 * * *",
        scheduleHuman: "Täglich um 19:00 Uhr",
        type: "system",
        status: "active",
        nextRun: new Date("2026-03-18T19:00:00+01:00"),
        payload: JSON.stringify({
          action: "project_review",
          description: "Review aller Projekte → neue Task-Vorschläge → Telegram-Benachrichtigung"
        })
      },
      {
        name: "Heartbeat — Offene Tasks prüfen",
        description: "Bei jedem Heartbeat werden offene Tasks aus Mission Control geladen und autonom abgearbeitet, falls möglich.",
        schedule: "*/30 * * * *",
        scheduleHuman: "Alle 30 Minuten",
        type: "system",
        status: "active",
        payload: JSON.stringify({
          action: "heartbeat_tasks",
          description: "GET /api/tasks → offene Tasks filtern → autonom abarbeiten"
        })
      },
      {
        name: "Memory Maintenance",
        description: "Prüft Memory-Dateien, destilliert wichtige Erkenntnisse ins Langzeit-Gedächtnis.",
        schedule: "0 3 * * 1",
        scheduleHuman: "Jeden Montag um 03:00 Uhr",
        type: "system",
        status: "inactive",
        payload: JSON.stringify({
          action: "memory_maintenance",
          description: "Daily memory files → Langzeit-Gedächtnis aktualisieren"
        })
      }
    ]
  });

  console.log("✅ CronJobs seeded");
  await prisma.$disconnect();
}

main().catch(console.error);
