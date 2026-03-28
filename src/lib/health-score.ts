/**
 * Projekt-Gesundheits-Score Berechnung (0–100)
 */

export interface HealthScoreInput {
  tasks: Array<{
    status: string;
    dueDate?: Date | string | null;
    updatedAt: Date | string;
    createdAt: Date | string;
  }>;
  hasActiveSprint: boolean;
  lastActivityAt: Date | string | null;
}

export function calculateHealthScore(data: HealthScoreInput): number {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let score = 50; // Basis-Score

  // Überfällige Tasks reduzieren den Score
  const overdueTasks = data.tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done" &&
      t.status !== "cancelled"
  );
  score -= Math.min(overdueTasks.length * 5, 30); // max -30

  // Abschlussrate der letzten Woche erhöht Score
  const recentlyDone = data.tasks.filter(
    (t) => t.status === "done" && new Date(t.updatedAt) >= sevenDaysAgo
  );
  const totalTasks = data.tasks.length;
  if (totalTasks > 0) {
    const completionRate = recentlyDone.length / Math.max(totalTasks, 1);
    score += Math.round(completionRate * 30); // max +30
  }

  // Aktiver Sprint = Bonus
  if (data.hasActiveSprint) score += 10;

  // Letzte Aktivität < 7 Tage = Bonus
  if (
    data.lastActivityAt &&
    new Date(data.lastActivityAt) >= sevenDaysAgo
  ) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function getHealthScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  if (score >= 50) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  return "bg-red-500/10 border-red-500/20 text-red-400";
}

export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Gesund";
  if (score >= 50) return "Mäßig";
  return "Kritisch";
}

export function getHealthScoreDot(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}
