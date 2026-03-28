import { requireAdminFromDb } from "@/lib/api-auth";
import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { UsersSettingsClient } from "./UsersSettingsClient";

export default async function SettingsUsersPage() {
  await requireServerSession();

  const admin = await requireAdminFromDb();

  if (!admin) {
    return (
      <AppShell title="Benutzerverwaltung" subtitle="Einstellungen">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">
            Dieser Bereich ist nur für Administratoren zugänglich.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Benutzerverwaltung" subtitle="Benutzer, Rollen & Berechtigungen verwalten">
      <UsersSettingsClient />
    </AppShell>
  );
}
