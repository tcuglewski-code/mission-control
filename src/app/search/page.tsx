import { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "Erweiterte Suche | Mission Control",
  description: "Unified Search über Tasks, Projekte, Dokumente und Rechnungen",
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      </div>
    }>
      <SearchClient />
    </Suspense>
  );
}
