import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return formatDate(date);
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "text-red-500";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-zinc-400";
    default:
      return "text-zinc-400";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
    case "done":
      return "text-emerald-500";
    case "in_progress":
      return "text-orange-500";
    case "in_review":
      return "text-blue-500";
    case "planning":
      return "text-purple-500";
    case "paused":
      return "text-zinc-400";
    case "archived":
      return "text-zinc-600";
    case "backlog":
      return "text-zinc-400";
    default:
      return "text-zinc-400";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "active":
    case "done":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "in_progress":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "in_review":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "planning":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "paused":
      return "bg-zinc-700/30 text-zinc-400 border-zinc-600/20";
    case "archived":
      return "bg-zinc-800/50 text-zinc-500 border-zinc-700/20";
    case "backlog":
      return "bg-zinc-700/30 text-zinc-400 border-zinc-600/20";
    default:
      return "bg-zinc-700/30 text-zinc-400 border-zinc-600/20";
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Active",
    done: "Done",
    in_progress: "In Progress",
    in_review: "In Review",
    planning: "Planning",
    paused: "Paused",
    archived: "Archived",
    backlog: "Backlog",
  };
  return labels[status] ?? status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return labels[priority] ?? priority;
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: "erstellt",
    updated: "aktualisiert",
    deleted: "gelöscht",
    completed: "abgeschlossen",
    review: "in Review",
    deployed: "deployed",
    commented: "kommentiert",
  };
  return labels[action] ?? action;
}

export function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    project: "Projekt",
    task: "Task",
    document: "Dokument",
    memory: "Memory",
    tool: "Tool",
    event: "Event",
    user: "User",
  };
  return labels[type] ?? type;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
