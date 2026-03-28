"use client";

import { useCallback } from "react";

export interface RecentVisit {
  id: string;
  type: "project" | "task";
  name: string;
  href: string;
  visitedAt: string; // ISO string
}

const STORAGE_KEY = "mc_recent_visits";
const MAX_VISITS = 10;

export function getRecentVisits(): RecentVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentVisit[]) : [];
  } catch {
    return [];
  }
}

export function trackVisit(visit: Omit<RecentVisit, "visitedAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentVisits().filter((v) => v.id !== visit.id);
    const updated: RecentVisit[] = [
      { ...visit, visitedAt: new Date().toISOString() },
      ...existing,
    ].slice(0, MAX_VISITS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function useRecentVisits() {
  const track = useCallback(
    (visit: Omit<RecentVisit, "visitedAt">) => trackVisit(visit),
    []
  );

  return { track, getVisits: getRecentVisits };
}
