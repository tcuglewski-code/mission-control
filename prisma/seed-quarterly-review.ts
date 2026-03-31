/**
 * Seed: Quartals-Review wiederkehrender Task
 * Erstellt: 31.03.2026 (AF088)
 * 
 * Legt einen wiederkehrenden Task für das quartalsweise Roadmap-Review an.
 * Nutzt das Template in docs/quarterly-review-template.md
 * 
 * Ausführen: npx tsx prisma/seed-quarterly-review.ts
 */

import { PrismaClient, Priority, RecurringInterval } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗓️  Quartals-Review Seed startet...");

  // Suche nach Feldhub-Projekt oder lege Default-Projekt an
  let project = await prisma.project.findFirst({
    where: {
      OR: [
        { name: { contains: "Feldhub" } },
        { name: { contains: "AppFabrik" } },
        { name: { contains: "Roadmap" } },
      ],
    },
  });

  if (!project) {
    // Fallback: Erstes verfügbares Projekt
    project = await prisma.project.findFirst();
  }

  if (!project) {
    console.log("⚠️  Kein Projekt gefunden. Erstelle 'Roadmap & Planning' Projekt...");
    project = await prisma.project.create({
      data: {
        name: "📅 Roadmap & Planning",
        description: "Strategische Planung, OKRs, Quartals-Reviews",
        color: "#8B5CF6", // Violett
        status: "active",
      },
    });
  }

  // Suche oder erstelle Tomek als Owner
  let owner = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: "Tomek" } },
        { name: { contains: "Admin" } },
        { email: { contains: "tomek" } },
      ],
    },
  });

  // Prüfe ob Task bereits existiert
  const existingTask = await prisma.task.findFirst({
    where: {
      title: { contains: "Quartals-Review" },
      recurring: true,
    },
  });

  if (existingTask) {
    console.log("ℹ️  Quartals-Review Task existiert bereits:", existingTask.id);
    return;
  }

  // Berechne nächstes Quartalsende (31. März, 30. Juni, 30. September, 31. Dezember)
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  let nextQuarterEnd: Date;

  if (currentMonth < 3) {
    // Q1 → Ende März
    nextQuarterEnd = new Date(now.getFullYear(), 2, 31);
  } else if (currentMonth < 6) {
    // Q2 → Ende Juni
    nextQuarterEnd = new Date(now.getFullYear(), 5, 30);
  } else if (currentMonth < 9) {
    // Q3 → Ende September
    nextQuarterEnd = new Date(now.getFullYear(), 8, 30);
  } else {
    // Q4 → Ende Dezember
    nextQuarterEnd = new Date(now.getFullYear(), 11, 31);
  }

  // Wenn das Datum in der Vergangenheit liegt → nächstes Quartal
  if (nextQuarterEnd <= now) {
    nextQuarterEnd.setMonth(nextQuarterEnd.getMonth() + 3);
  }

  // Erstelle den wiederkehrenden Task
  const task = await prisma.task.create({
    data: {
      title: "📋 Quartals-Review: Roadmap & OKRs",
      description: `## Quartals-Review durchführen

### Aufgabe
Führe das quartalsweise Roadmap-Review durch mit allen Stakeholdern.

### Template
Nutze das Template: \`docs/quarterly-review-template.md\`

### Checkliste
- [ ] OKRs aus /okr exportieren (Fortschrittsstatus)
- [ ] Metriken aus Finance Dashboard ziehen
- [ ] Team-Feedback sammeln
- [ ] Review-Meeting durchführen (max. 2h)
- [ ] Ergebnisse dokumentieren
- [ ] Neue OKRs für nächstes Quartal anlegen
- [ ] Carryover-Tasks identifizieren

### Teilnehmer
- Tomek (Moderator)
- Amadeus (Daten-Aggregation)

### Output
- Ausgefülltes Review-Template
- Neue OKRs in Mission Control
- Aktualisierte Roadmap`,
      priority: Priority.high,
      status: "backlog",
      labels: ["review", "planning", "okr", "quarterly"],
      projectId: project.id,
      assigneeId: owner?.id || null,
      dueDate: nextQuarterEnd,
      recurring: true,
      recurringInterval: RecurringInterval.QUARTERLY,
      recurringDay: null, // Automatisch letzter Tag des Quartals
    },
  });

  console.log("✅ Quartals-Review Task erstellt:");
  console.log(`   ID: ${task.id}`);
  console.log(`   Titel: ${task.title}`);
  console.log(`   Projekt: ${project.name}`);
  console.log(`   Fällig: ${nextQuarterEnd.toISOString().split("T")[0]}`);
  console.log(`   Wiederkehrend: QUARTERLY`);
  console.log("");
  console.log("📅 Nächste Reviews:");
  console.log(`   Q2 2026: 30.06.2026`);
  console.log(`   Q3 2026: 30.09.2026`);
  console.log(`   Q4 2026: 31.12.2026`);
  console.log(`   Q1 2027: 31.03.2027`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
