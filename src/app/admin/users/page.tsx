import { requireAdminFromDb } from "@/lib/api-auth";
import { AdminUsersClient } from "./AdminUsersClient";
import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";

export default async function AdminUsersPage() {
  // Check if user is logged in at all
  await requireServerSession(); // redirects to /login if not logged in

  const admin = await requireAdminFromDb();

  if (!admin) {
    return (
      <AppShell title="Benutzerverwaltung" subtitle="Admin-Bereich">
        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Kein Zugriff</h2>
          <p className="text-sm text-zinc-500">Dieser Bereich ist nur für Administratoren zugänglich.</p>
        </div>
      </AppShell>
    );
  }

  return <AdminUsersClient />;
}
