import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ka = await prisma.tenant.upsert({
    where: { slug: "koch-aufforstung" },
    update: {},
    create: {
      name: "Koch Aufforstung GmbH",
      slug: "koch-aufforstung",
      industry: "Forstwirtschaft",
      status: "active",
      contactName: "Koch Aufforstung",
      systems: {
        create: [
          { name: "ForstManager", type: "forstmanager", url: "https://ka-forstmanager.vercel.app", status: "live" },
          { name: "Mobile App", type: "app", url: "", status: "live" },
          { name: "Website", type: "website", url: "https://peru-otter-113714.hostingersite.com", status: "live" },
        ]
      },
      contracts: {
        create: [{
          type: "saas",
          status: "active",
          startDate: new Date("2026-01-01"),
          monthlyRate: 299,
          setupFee: 2500,
          billingCycle: "monthly",
        }]
      }
    }
  });
  console.log("Seeded:", ka.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());
