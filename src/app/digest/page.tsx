import { AppShell } from "@/components/layout/AppShell";
import { DigestClient } from "./DigestClient";

export default function DigestPage() {
  return (
    <AppShell title="KI-Digest" subtitle="Tägliches Morning Briefing">
      <DigestClient />
    </AppShell>
  );
}
