import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";
import { ExportsClient } from "./ExportsClient";

export default async function ExportsPage() {
  await requireServerSession();

  return (
    <AppShell title="Export-Center" subtitle="Alle Daten-Exporte an einem Ort">
      <ExportsClient />
    </AppShell>
  );
}
