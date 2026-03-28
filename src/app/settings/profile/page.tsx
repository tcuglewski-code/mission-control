import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileClient } from "./ProfileClient";

export default async function SettingsProfilePage() {
  await requireServerSession();

  return (
    <AppShell title="Mein Profil" subtitle="Profil, Passwort & Einstellungen">
      <ProfileClient />
    </AppShell>
  );
}
