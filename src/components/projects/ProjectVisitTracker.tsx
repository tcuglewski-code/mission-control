"use client";

import { useEffect } from "react";
import { trackVisit } from "@/hooks/useRecentVisits";

interface ProjectVisitTrackerProps {
  id: string;
  name: string;
}

export function ProjectVisitTracker({ id, name }: ProjectVisitTrackerProps) {
  useEffect(() => {
    trackVisit({
      id,
      type: "project",
      name,
      href: `/projects/${id}`,
    });
  }, [id, name]);

  return null;
}
