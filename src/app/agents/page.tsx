import { AppShell } from "@/components/layout/AppShell";
import { AgentsClient } from "./AgentsClient";

export default function AgentsPage() {
  return (
    <AppShell title="Agent Registry" subtitle="Registrierte KI-Agenten und ihr Status">
      <AgentsClient />
    </AppShell>
  );
}
