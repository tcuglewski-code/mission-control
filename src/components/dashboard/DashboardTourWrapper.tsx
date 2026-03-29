"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardTour } from "@/components/layout/DashboardTour";

/**
 * Startet die Dashboard-Tour wenn:
 * a) URL-Parameter ?tour=1 vorhanden (nach Onboarding)
 * b) tourComplete=false in der DB (noch nicht abgeschlossen)
 */
export function DashboardTourWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourParam = searchParams.get("tour");

    if (tourParam === "1") {
      // Direkt starten (nach Onboarding)
      setShowTour(true);
      // URL-Parameter entfernen ohne Reload
      router.replace("/dashboard", { scroll: false });
      return;
    }

    // DB prüfen: tourComplete?
    fetch("/api/onboarding")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.tourComplete) {
          setShowTour(true);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showTour) return null;

  return (
    <DashboardTour
      onComplete={() => setShowTour(false)}
    />
  );
}
export const dynamic = "force-dynamic";
