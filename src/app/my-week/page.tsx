import { AppShell } from "@/components/layout/AppShell";
import { MeineWocheClient } from "./MeineWocheClient";

export default function MeineWochePage() {
  return (
    <AppShell title="Meine Woche" subtitle="Wochenzusammenfassung">
      <MeineWocheClient />
    </AppShell>
  );
}
