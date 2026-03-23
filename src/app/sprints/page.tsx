import { AppShell } from "@/components/layout/AppShell";
import { SprintsClient } from "./SprintsClient";

export default function SprintsPage() {
  return (
    <AppShell title="Sprints" subtitle="Sprint-Planung & Verwaltung">
      <SprintsClient />
    </AppShell>
  );
}
