import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed-Script für Demo-Onboarding-Daten
 * Erstellt: 1 Demo-Projekt, 1 Demo-Sprint mit 3 Tasks, 1 Demo-Meilenstein
 * 
 * Verwendung: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-demo-onboarding.ts
 */
async function main() {
  console.log("🎬 Seeding Demo-Onboarding-Daten...");

  // Hole oder erstelle einen Demo-User
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@mission-control.ai" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@mission-control.ai",
      role: "human",
      avatar: "D",
    },
  });

  console.log("✅ Demo-User erstellt/gefunden:", demoUser.name);

  // 1. Demo-Projekt erstellen
  const demoProject = await prisma.project.upsert({
    where: { id: "demo-onboarding-project" },
    update: {
      name: "🎯 Demo-Projekt: Digitales Auftragsmanagement",
      description: "Beispielprojekt zum Kennenlernen von Mission Control. Enthält einen Sprint, Tasks und einen Meilenstein als Anschauungsmaterial.",
      progress: 33,
      status: "active",
      priority: "medium",
      color: "#f59e0b",
    },
    create: {
      id: "demo-onboarding-project",
      name: "🎯 Demo-Projekt: Digitales Auftragsmanagement",
      description: "Beispielprojekt zum Kennenlernen von Mission Control. Enthält einen Sprint, Tasks und einen Meilenstein als Anschauungsmaterial.",
      progress: 33,
      status: "active",
      priority: "medium",
      color: "#f59e0b",
    },
  });

  console.log("✅ Demo-Projekt erstellt:", demoProject.name);

  // Projekt-Member hinzufügen
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: demoProject.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      projectId: demoProject.id,
      userId: demoUser.id,
      role: "owner",
    },
  });

  // 2. Demo-Sprint erstellen
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14); // 2-Wochen Sprint

  const demoSprint = await prisma.sprint.upsert({
    where: { id: "demo-onboarding-sprint" },
    update: {
      name: "Sprint 1: Grundlagen aufbauen",
      description: "Erster Demo-Sprint mit Beispiel-Tasks. Ziel: Kernfunktionen verstehen und erste Schritte umsetzen.",
      status: "active",
      startDate: startDate,
      endDate: endDate,
      goal: "Einrichtung der Basisfunktionen und Kennenlernen des Workflows",
      projectId: demoProject.id,
      storyPoints: 13,
      completedPoints: 5,
    },
    create: {
      id: "demo-onboarding-sprint",
      name: "Sprint 1: Grundlagen aufbauen",
      description: "Erster Demo-Sprint mit Beispiel-Tasks. Ziel: Kernfunktionen verstehen und erste Schritte umsetzen.",
      status: "active",
      startDate: startDate,
      endDate: endDate,
      goal: "Einrichtung der Basisfunktionen und Kennenlernen des Workflows",
      projectId: demoProject.id,
      storyPoints: 13,
      completedPoints: 5,
    },
  });

  console.log("✅ Demo-Sprint erstellt:", demoSprint.name);

  // 3. Drei Demo-Tasks im Sprint erstellen
  const task1 = await prisma.task.upsert({
    where: { id: "demo-task-1" },
    update: {
      title: "📋 Dashboard kennenlernen",
      description: "Erkunde das Dashboard und mach dich mit den wichtigsten Kennzahlen vertraut. Das Dashboard zeigt: offene Tasks, Projekt-Fortschritt, Team-Aktivitäten und anstehende Deadlines.",
      status: "done",
      priority: "high",
      labels: "onboarding,documentation",
      storyPoints: 5,
    },
    create: {
      id: "demo-task-1",
      title: "📋 Dashboard kennenlernen",
      description: "Erkunde das Dashboard und mach dich mit den wichtigsten Kennzahlen vertraut. Das Dashboard zeigt: offene Tasks, Projekt-Fortschritt, Team-Aktivitäten und anstehende Deadlines.",
      status: "done",
      priority: "high",
      labels: "onboarding,documentation",
      projectId: demoProject.id,
      sprintId: demoSprint.id,
      assigneeId: demoUser.id,
      storyPoints: 5,
      dueDate: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 Tage
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: "demo-task-2" },
    update: {
      title: "✏️ Ersten eigenen Task erstellen",
      description: "Erstelle deinen ersten eigenen Task über das Kanban-Board oder die Task-Liste. Tipp: Nutze Cmd+K (oder Strg+K) für schnelle Aktionen!",
      status: "in_progress",
      priority: "medium",
      labels: "onboarding,hands-on",
      storyPoints: 3,
    },
    create: {
      id: "demo-task-2",
      title: "✏️ Ersten eigenen Task erstellen",
      description: "Erstelle deinen ersten eigenen Task über das Kanban-Board oder die Task-Liste. Tipp: Nutze Cmd+K (oder Strg+K) für schnelle Aktionen!",
      status: "in_progress",
      priority: "medium",
      labels: "onboarding,hands-on",
      projectId: demoProject.id,
      sprintId: demoSprint.id,
      assigneeId: demoUser.id,
      storyPoints: 3,
      dueDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 Tage
    },
  });

  const task3 = await prisma.task.upsert({
    where: { id: "demo-task-3" },
    update: {
      title: "🗓️ Kalender-Event hinzufügen",
      description: "Füge ein Test-Event im Kalender hinzu (z.B. ein Meeting oder eine Deadline). Der Kalender synchronisiert sich mit deinen Projekt-Meilensteinen.",
      status: "backlog",
      priority: "low",
      labels: "onboarding,calendar",
      storyPoints: 5,
    },
    create: {
      id: "demo-task-3",
      title: "🗓️ Kalender-Event hinzufügen",
      description: "Füge ein Test-Event im Kalender hinzu (z.B. ein Meeting oder eine Deadline). Der Kalender synchronisiert sich mit deinen Projekt-Meilensteinen.",
      status: "backlog",
      priority: "low",
      labels: "onboarding,calendar",
      projectId: demoProject.id,
      sprintId: demoSprint.id,
      assigneeId: demoUser.id,
      storyPoints: 5,
      dueDate: new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000), // +14 Tage
    },
  });

  console.log("✅ 3 Demo-Tasks erstellt:", [task1.title, task2.title, task3.title].join(", "));

  // 4. Demo-Meilenstein erstellen
  const milestoneDueDate = new Date(startDate);
  milestoneDueDate.setDate(milestoneDueDate.getDate() + 30); // in 30 Tagen

  const demoMilestone = await prisma.milestone.upsert({
    where: { id: "demo-onboarding-milestone" },
    update: {
      title: "🏁 Onboarding abgeschlossen",
      description: "Du hast alle Grundfunktionen von Mission Control kennengelernt und bist bereit, eigene Projekte zu verwalten. Herzlichen Glückwunsch!",
      status: "planned",
      progress: 33,
      color: "#10b981",
      dueDate: milestoneDueDate,
    },
    create: {
      id: "demo-onboarding-milestone",
      title: "🏁 Onboarding abgeschlossen",
      description: "Du hast alle Grundfunktionen von Mission Control kennengelernt und bist bereit, eigene Projekte zu verwalten. Herzlichen Glückwunsch!",
      status: "planned",
      progress: 33,
      color: "#10b981",
      dueDate: milestoneDueDate,
      projectId: demoProject.id,
    },
  });

  console.log("✅ Demo-Meilenstein erstellt:", demoMilestone.title);

  // Verknüpfe Tasks mit Meilenstein (via Update, da Task → Milestone optional ist)
  await prisma.task.updateMany({
    where: {
      id: { in: ["demo-task-1", "demo-task-2", "demo-task-3"] },
    },
    data: {
      milestoneId: demoMilestone.id,
    },
  });

  console.log("✅ Tasks mit Meilenstein verknüpft");

  // 5. Activity Log für Demo-Aktionen
  await prisma.activityLog.createMany({
    data: [
      {
        action: "created",
        entityType: "project",
        entityId: demoProject.id,
        entityName: demoProject.name,
        userId: demoUser.id,
        projectId: demoProject.id,
        metadata: JSON.stringify({ type: "demo-onboarding" }),
      },
      {
        action: "created",
        entityType: "sprint",
        entityId: demoSprint.id,
        entityName: demoSprint.name,
        userId: demoUser.id,
        projectId: demoProject.id,
      },
      {
        action: "completed",
        entityType: "task",
        entityId: task1.id,
        entityName: task1.title,
        userId: demoUser.id,
        projectId: demoProject.id,
      },
    ],
  });

  console.log("✅ Activity Logs erstellt");

  console.log("\n🎉 Demo-Onboarding-Daten erfolgreich angelegt!");
  console.log("   - 1 Demo-Projekt: " + demoProject.name);
  console.log("   - 1 Demo-Sprint: " + demoSprint.name + " (mit 3 Tasks)");
  console.log("   - 1 Demo-Meilenstein: " + demoMilestone.title);
}

main()
  .catch((e) => {
    console.error("❌ Demo-Seeding fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
