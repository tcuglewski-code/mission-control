/**
 * Seed Script für Sales Pipeline Demo-Daten
 * 
 * Ausführen mit: npx tsx scripts/seed-sales-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoDeals = [
  // Prospect
  {
    title: "ForstManager für Waldgenossenschaft Bayern",
    company: "Waldgenossenschaft Oberbayern eG",
    contactName: "Thomas Huber",
    contactEmail: "huber@waldgeno-bayern.de",
    contactPhone: "+49 89 12345678",
    value: 24000,
    stage: "prospect",
    probability: 10,
    source: "Website",
    industry: "Forstbetrieb",
    employees: 15,
    nextAction: "Kontaktaufnahme per E-Mail",
    ownerName: "Tomek",
    notes: "Anfrage über Website-Kontaktformular. Interesse an digitaler Verwaltung für 800ha Waldfläche.",
  },
  {
    title: "Gartenbau Schmidt Digitalisierung",
    company: "Gartenbau Schmidt GmbH",
    contactName: "Maria Schmidt",
    contactEmail: "m.schmidt@gartenbau-schmidt.de",
    value: 18000,
    stage: "prospect",
    probability: 10,
    source: "LinkedIn",
    industry: "Landschaftsbau",
    employees: 8,
    nextAction: "LinkedIn-Nachricht senden",
    ownerName: "Tomek",
  },

  // Qualified
  {
    title: "ForstManager für Forstbetrieb Schwarzwald",
    company: "Forstbetrieb Müller-Schwarzwald",
    contactName: "Hans Müller",
    contactEmail: "mueller@forstbetrieb-sw.de",
    contactPhone: "+49 761 9876543",
    value: 36000,
    stage: "qualified",
    probability: 25,
    source: "Empfehlung",
    industry: "Forstbetrieb",
    employees: 22,
    nextAction: "Budget und Zeitplan besprechen",
    nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 Tage
    ownerName: "Tomek",
    notes: "Empfehlung von Koch Aufforstung. Interessiert an komplettem Paket inkl. App.",
  },
  {
    title: "Tiefbau Weber Außendienst-App",
    company: "Weber Tiefbau AG",
    contactName: "Klaus Weber",
    contactEmail: "weber@weber-tiefbau.de",
    value: 42000,
    stage: "qualified",
    probability: 25,
    source: "Messe",
    industry: "Tiefbau",
    employees: 45,
    nextAction: "Anforderungen dokumentieren",
    ownerName: "Tomek",
    notes: "Kennengelernt auf ForstMesse 2026. Sucht Lösung für Zeiterfassung und Dokumentation.",
  },

  // Demo
  {
    title: "Komplettlösung Baumschule Lorenz",
    company: "Baumschule Lorenz GmbH",
    contactName: "Peter Lorenz",
    contactEmail: "peter@baumschule-lorenz.de",
    contactPhone: "+49 40 11223344",
    value: 28000,
    stage: "demo",
    probability: 50,
    source: "Google",
    industry: "Forstbetrieb",
    employees: 18,
    nextAction: "Demo durchführen",
    nextActionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 Tage
    ownerName: "Tomek",
    notes: "Hat ForstManager Demo gesehen, sehr interessiert. Demo-Termin vereinbart.",
  },

  // Proposal
  {
    title: "Landschaftspflege Grün & Partner",
    company: "Grün & Partner Landschaftspflege",
    contactName: "Stefan Grün",
    contactEmail: "s.gruen@gruen-partner.de",
    value: 32000,
    stage: "proposal",
    probability: 75,
    source: "Empfehlung",
    industry: "Landschaftsbau",
    employees: 28,
    nextAction: "Angebot nachfassen",
    nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 Tage
    ownerName: "Tomek",
    notes: "Angebot versendet. Budget genehmigt, wartet auf finale Freigabe.",
  },

  // Closed Won (Referenz)
  {
    title: "Koch Aufforstung GmbH — Referenzkunde",
    company: "Koch Aufforstung GmbH",
    contactName: "Markus Koch",
    contactEmail: "koch@koch-aufforstung.de",
    contactPhone: "+49 234 5678901",
    value: 48000,
    stage: "closed-won",
    probability: 100,
    source: "Website",
    industry: "Forstbetrieb",
    employees: 35,
    ownerName: "Tomek",
    notes: "Erster Kunde. ForstManager + App + Website komplett umgesetzt.",
    wonDate: new Date("2026-01-15"),
  },

  // Closed Lost (Learnings)
  {
    title: "Reinigungsdienst Sauber AG",
    company: "Sauber AG",
    contactName: "Anna Meier",
    contactEmail: "meier@sauber-ag.de",
    value: 22000,
    stage: "closed-lost",
    probability: 0,
    source: "Kaltakquise",
    industry: "Reinigung",
    employees: 120,
    ownerName: "Tomek",
    notes: "Hat sich für Konkurrenzprodukt entschieden (günstiger, aber weniger Funktionen).",
    lostReason: "Preis — Konkurrenz günstiger",
    lostDate: new Date("2026-03-10"),
  },
];

async function main() {
  console.log("🌱 Seeding Sales Pipeline Demo-Daten...");

  // Erst alle Demo-Deals löschen (falls vorhanden)
  const existingDeals = await prisma.deal.findMany({
    where: {
      company: { in: demoDeals.map((d) => d.company) },
    },
  });

  if (existingDeals.length > 0) {
    console.log(`🗑️  Lösche ${existingDeals.length} existierende Demo-Deals...`);
    await prisma.dealActivity.deleteMany({
      where: { dealId: { in: existingDeals.map((d) => d.id) } },
    });
    await prisma.deal.deleteMany({
      where: { id: { in: existingDeals.map((d) => d.id) } },
    });
  }

  // Neue Deals erstellen
  for (const dealData of demoDeals) {
    const deal = await prisma.deal.create({
      data: dealData as any,
    });

    // Initiale Activity
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: "note",
        content: `Deal "${deal.title}" erstellt`,
        authorName: "System (Demo-Seed)",
      },
    });

    console.log(`✅ Deal erstellt: ${deal.title} (${deal.stage})`);
  }

  console.log("\n🎉 Sales Demo-Daten erfolgreich erstellt!");
  console.log(`   ${demoDeals.length} Deals in der Pipeline`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler beim Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
