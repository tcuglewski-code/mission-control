import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { TenantsClient } from "./TenantsClient";

export default async function TenantsPage() {
  await requireServerSession();

  const tenants = await prisma.tenant.findMany({
    include: {
      systems: true,
      contracts: { where: { status: "active" } },
    },
    orderBy: { name: "asc" },
  });

  const totalMRR = tenants.reduce(
    (sum, t) => sum + t.contracts.reduce((s, c) => s + c.monthlyRate, 0),
    0
  );

  return (
    <AppShell title="Tenant-Verwaltung" subtitle="Alle Kunden und deren Systeme">
      <TenantsClient
        tenants={JSON.parse(JSON.stringify(tenants))}
        totalMRR={totalMRR}
      />
    </AppShell>
  );
}
