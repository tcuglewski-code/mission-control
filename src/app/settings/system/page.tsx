import { requireServerSession } from "@/lib/server-auth";
import { AppShell } from "@/components/layout/AppShell";
import { SystemStatusClient } from "./SystemStatusClient";

export const metadata = { title: "System-Status — Mission Control" };

export default async function SystemStatusPage() {
  await requireServerSession();
  return (
    <AppShell title="System-Status" subtitle="Deployment, Datenbank & Fehler-Protokoll">
      <SystemStatusClient />
    </AppShell>
  );
}
