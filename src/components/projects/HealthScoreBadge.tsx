import { getHealthScoreBg, getHealthScoreLabel, getHealthScoreDot } from "@/lib/health-score";

interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function HealthScoreBadge({ score, size = "md" }: HealthScoreBadgeProps) {
  const bg = getHealthScoreBg(score);
  const label = getHealthScoreLabel(score);
  const dot = getHealthScoreDot(score);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {score}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bg}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs font-bold tabular-nums">{score}/100</span>
    </div>
  );
}
