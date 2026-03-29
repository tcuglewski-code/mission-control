import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsSettingsClient } from "./NotificationsSettingsClient";

export const metadata = { title: "Benachrichtigungs-Einstellungen — Mission Control" };

export default async function NotificationsSettingsPage() {
  await requireServerSession();
  return (
    <AppShell title="Benachrichtigungen" subtitle="Ereignisse, Kanäle & Digest-Einstellungen">
      <NotificationsSettingsClient />
    </AppShell>
  );
}
