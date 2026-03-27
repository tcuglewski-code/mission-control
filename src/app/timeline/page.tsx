import { AppShell } from "@/components/layout/AppShell";
import { TimelineClient } from "./TimelineClient";

export default function TimelinePage() {
  return (
    <AppShell title="Timeline" subtitle="Gantt-Chart aller Projekte und Tasks">
      <TimelineClient />
    </AppShell>
  );
}
