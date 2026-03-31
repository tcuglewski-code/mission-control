import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🎯 Seeding OKRs für Feldhub Q2 2026...\n");

  // OKR 1: Ersten Kunden #2 onboarden
  const okr1 = await prisma.objective.create({
    data: {
      title: "Ersten zahlenden Kunden #2 onboarden",
      description: "Erster Neukunde nach Koch Aufforstung. Zielbranche: Landschaftsbau, Tiefbau oder Forstbetrieb. Vollständiges Onboarding inkl. Setup, Training und Go-Live.",
      period: "Q2 2026",
      deadline: new Date("2026-06-30T23:59:59Z"),
      status: "on-track",
      ownerName: "Tomek",
      keyResults: {
        create: [
          {
            title: "Sales Pipeline: min. 5 qualifizierte Leads",
            metric: "Anzahl qualifizierter Leads (Stage: qualified+)",
            current: 0,
            target: 5,
            unit: "Leads",
            progress: 0
          },
          {
            title: "Demo-Präsentationen durchgeführt",
            metric: "Anzahl Demos",
            current: 0,
            target: 3,
            unit: "Demos",
            progress: 0
          },
          {
            title: "Kunde #2 Vertrag unterschrieben + Setup abgeschlossen",
            metric: "Onboarding abgeschlossen",
            current: 0,
            target: 1,
            unit: "Kunde",
            progress: 0
          }
        ]
      }
    },
    include: { keyResults: true }
  });
  console.log(`✅ OKR 1 erstellt: "${okr1.title}" (${okr1.keyResults.length} Key Results)`);

  // OKR 2: Feldhub Website live
  const okr2 = await prisma.objective.create({
    data: {
      title: "Feldhub Website live schalten",
      description: "Professionelle Unternehmenswebsite für Feldhub mit Produktseiten, Case Study (Koch Aufforstung), Kontaktformular und SEO-Optimierung.",
      period: "Q2 2026",
      deadline: new Date("2026-05-31T23:59:59Z"),
      status: "on-track",
      ownerName: "Tomek",
      keyResults: {
        create: [
          {
            title: "Domain feldhub.de / feldhub.com registriert",
            metric: "Domain aktiv",
            current: 0,
            target: 1,
            unit: "Domain",
            progress: 0
          },
          {
            title: "Website deployed + SSL aktiv",
            metric: "Lighthouse Score",
            current: 0,
            target: 90,
            unit: "Punkte",
            progress: 0
          },
          {
            title: "Alle Kernseiten fertig (Home, Produkte, Case Study, Kontakt, Preise)",
            metric: "Seiten fertig",
            current: 0,
            target: 5,
            unit: "Seiten",
            progress: 0
          },
          {
            title: "SEO-Basics: Meta-Tags, Sitemap, Schema.org, Google Search Console",
            metric: "SEO-Checkliste",
            current: 0,
            target: 4,
            unit: "Items",
            progress: 0
          }
        ]
      }
    },
    include: { keyResults: true }
  });
  console.log(`✅ OKR 2 erstellt: "${okr2.title}" (${okr2.keyResults.length} Key Results)`);

  // OKR 3: MRR €2.000 erreichen
  const okr3 = await prisma.objective.create({
    data: {
      title: "MRR €2.000 erreichen",
      description: "Monatlich wiederkehrender Umsatz (Monthly Recurring Revenue) aus SaaS-Verträgen. Beinhaltet Koch Aufforstung (bestehend) + Neukunden.",
      period: "Q2 2026",
      deadline: new Date("2026-06-30T23:59:59Z"),
      status: "on-track",
      ownerName: "Tomek",
      keyResults: {
        create: [
          {
            title: "Koch Aufforstung Monatsvertrag aktiv",
            metric: "MRR Koch Aufforstung",
            current: 0,
            target: 800,
            unit: "€/Monat",
            progress: 0
          },
          {
            title: "Kunde #2 Monatsvertrag aktiv",
            metric: "MRR Kunde #2",
            current: 0,
            target: 600,
            unit: "€/Monat",
            progress: 0
          },
          {
            title: "Zusatz-Revenue (Zipayo Transaktionen, Consulting)",
            metric: "Zusatz-MRR",
            current: 0,
            target: 600,
            unit: "€/Monat",
            progress: 0
          },
          {
            title: "Gesamt-MRR Q2 Ende",
            metric: "MRR Total",
            current: 0,
            target: 2000,
            unit: "€",
            progress: 0
          }
        ]
      }
    },
    include: { keyResults: true }
  });
  console.log(`✅ OKR 3 erstellt: "${okr3.title}" (${okr3.keyResults.length} Key Results)`);

  console.log("\n🎯 Alle Q2 2026 OKRs erfolgreich angelegt!");
  console.log(`   Objectives: 3`);
  console.log(`   Key Results: ${okr1.keyResults.length + okr2.keyResults.length + okr3.keyResults.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler beim Seeden:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
