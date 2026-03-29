import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";
import { CsvExportClient } from "./CsvExportClient";

export default async function CsvExportPage() {
  await requireServerSession();

  return (
    <AppShell title="CSV Export" subtitle="Daten exportieren und konfigurieren">
      <div className="p-6 max-w-3xl mx-auto">
        <CsvExportClient />
      </div>
    </AppShell>
  );
}
