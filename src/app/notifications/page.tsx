import { AppShell } from "@/components/layout/AppShell";
import { NotificationsClient } from "./NotificationsClient";

export const metadata = { title: "Benachrichtigungen — Mission Control" };

export default function NotificationsPage() {
  return (
    <AppShell title="Benachrichtigungen" subtitle="Alle deine Benachrichtigungen im Überblick" noScroll>
      <NotificationsClient />
    </AppShell>
  );
}
