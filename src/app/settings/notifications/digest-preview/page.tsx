import { AppShell } from "@/components/layout/AppShell";
import { DigestPreviewClient } from "./DigestPreviewClient";

export const metadata = { title: "E-Mail Digest Vorschau — Mission Control" };

export default function DigestPreviewPage() {
  return (
    <AppShell title="E-Mail Digest Vorschau" subtitle="So sieht dein täglicher Digest aus" noScroll>
      <DigestPreviewClient />
    </AppShell>
  );
}
