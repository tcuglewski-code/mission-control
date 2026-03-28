import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ResourcesClient } from "./ResourcesClient";

export default async function TeamResourcesPage() {
  const session = await requireServerSession();
  const hasAccess = hasPermission(session, PERMISSIONS.TEAM_VIEW);

  if (!hasAccess) {
    return (
      <AppShell title="Ressourcenplanung" subtitle="Team-Auslastung & Kapazität">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Du hast keine Berechtigung für das Team-Modul.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Ressourcenplanung" subtitle="Team-Auslastung & Kapazität der nächsten 4 Wochen">
      <div className="p-6">
        <ResourcesClient />
      </div>
    </AppShell>
  );
}
