import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Lösche alle bestehenden User...");
  
  // Alle verknüpften Daten zuerst löschen
  await prisma.projectMember.deleteMany({});
  await prisma.activityLog.updateMany({ data: { userId: null } });
  await prisma.task.updateMany({ data: { assigneeId: null } });
  await prisma.user.deleteMany({});

  console.log("✅ Alle User gelöscht.");

  const agents = [
    {
      name: "Amadeus",
      email: "amadeus@openclaw.ai",
      role: "agent",
      avatar: "🎼",
      description: "Projekt-Orchestrator & Systemarchitekt — dirigiert das Team",
      tools: JSON.stringify(["OpenClaw", "Prisma", "GitHub"]),
      skills: JSON.stringify(["Orchestrierung", "Planung", "Architektur"]),
    },
    {
      name: "Pixel",
      email: "pixel@openclaw.ai",
      role: "agent",
      avatar: "🎨",
      description: "UX/UI Designer — macht alles schön",
      tools: JSON.stringify(["Figma", "shadcn", "Tailwind"]),
      skills: JSON.stringify(["Design", "UX", "Prototyping"]),
    },
    {
      name: "Quill",
      email: "quill@openclaw.ai",
      role: "agent",
      avatar: "✍️",
      description: "Copywriter & SEO — der Wortakrobat",
      tools: JSON.stringify(["Perplexity", "Ahrefs", "WordPress"]),
      skills: JSON.stringify(["Copywriting", "SEO", "Content"]),
    },
    {
      name: "Volt",
      email: "volt@openclaw.ai",
      role: "agent",
      avatar: "⚡",
      description: "Frontend Developer — baut was Volt anpackt",
      tools: JSON.stringify(["React", "Next.js", "Tailwind"]),
      skills: JSON.stringify(["Frontend", "TypeScript", "UI-Entwicklung"]),
    },
    {
      name: "Bruno",
      email: "bruno@openclaw.ai",
      role: "agent",
      avatar: "⚙️",
      description: "WP & Backend Dev — der zuverlässige Maschinenbauer",
      tools: JSON.stringify(["WordPress", "PHP", "MySQL"]),
      skills: JSON.stringify(["WordPress", "Backend", "Plugin-Entwicklung"]),
    },
    {
      name: "Argus",
      email: "argus@openclaw.ai",
      role: "agent",
      avatar: "🔒",
      description: "QA & Security — hat 100 Augen und übersieht nichts",
      tools: JSON.stringify(["Jest", "Security Audit", "Playwright"]),
      skills: JSON.stringify(["QA", "Testing", "Security"]),
    },
    {
      name: "Nomad",
      email: "nomad@openclaw.ai",
      role: "agent",
      avatar: "📱",
      description: "App Developer — immer unterwegs, immer online",
      tools: JSON.stringify(["Expo", "React Native", "WatermelonDB"]),
      skills: JSON.stringify(["Mobile", "React Native", "Offline-First"]),
    },
    {
      name: "Archie",
      email: "archie@openclaw.ai",
      role: "agent",
      avatar: "🗄️",
      description: "DB & API Architekt — kennt jede Tabelle auswendig",
      tools: JSON.stringify(["PostgreSQL", "pgvector", "REST API"]),
      skills: JSON.stringify(["Datenbankdesign", "API", "Datenmodellierung"]),
    },
    {
      name: "Sylvia",
      email: "sylvia@openclaw.ai",
      role: "agent",
      avatar: "🌲",
      description: "Förder-Intelligence — Waldexpertin mit Fördermittel-Superpower",
      tools: JSON.stringify(["Perplexity", "Crawl4AI", "pgvector"]),
      skills: JSON.stringify(["Fördermittel", "Research", "Datenanalyse"]),
    },
    {
      name: "Tomek",
      email: "tomek@openclaw.ai",
      role: "human",
      avatar: "👤",
      description: "Auftraggeber & Vision-Owner",
      tools: JSON.stringify(["Telegram", "GitHub", "OpenClaw"]),
      skills: JSON.stringify(["Strategie", "Produktvision", "Entscheidungen"]),
    },
  ];

  console.log("🚀 Erstelle neue Agenten...");
  
  for (const agent of agents) {
    const created = await prisma.user.create({ data: agent });
    console.log(`  ✅ ${agent.avatar} ${agent.name} (${agent.role}) erstellt`);
  }

  console.log("\n✨ Team erfolgreich aktualisiert!");
  console.log(`   ${agents.filter(a => a.role === "agent").length} KI-Agenten + 1 Mensch`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
