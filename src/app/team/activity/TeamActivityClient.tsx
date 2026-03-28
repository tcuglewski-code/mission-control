"use client";

import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Activity, Users, Filter, Calendar, Clock, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface LogUser {
  id: string;
  name: string;
  avatar?: string | null;
}

interface LogProject {
  id: string;
  name: string;
  color: string;
}

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string | null;
  userEmail: string | null;
  projectId: string | null;
  metadata: string | null;
  createdAt: string;
  user: LogUser | null;
  project: LogProject | null;
}

interface TeamUser {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
}

interface Props {
  todayLogs: ActivityLogItem[];
  weekLogs: ActivityLogItem[];
  users: TeamUser[];
}

const ACTION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  created: { label: "erstellt", emoji: "✨", color: "text-emerald-400" },
  updated: { label: "aktualisiert", emoji: "✏️", color: "text-blue-400" },
  deleted: { label: "gelöscht", emoji: "🗑️", color: "text-red-400" },
  completed: { label: "abgeschlossen", emoji: "✅", color: "text-emerald-400" },
  done: { label: "erledigt", emoji: "✅", color: "text-emerald-400" },
  status_changed: { label: "Status geändert", emoji: "🔄", color: "text-yellow-400" },
  commented: { label: "kommentiert", emoji: "💬", color: "text-purple-400" },
  member_added: { label: "Mitglied hinzugefügt", emoji: "👤", color: "text-blue-400" },
  assigned: { label: "zugewiesen", emoji: "📌", color: "text-orange-400" },
  started: { label: "gestartet", emoji: "▶️", color: "text-emerald-400" },
  login: { label: "eingeloggt", emoji: "🔑", color: "text-zinc-400" },
};

const ENTITY_LABELS: Record<string, string> = {
  task: "Task",
  project: "Projekt",
  sprint: "Sprint",
  milestone: "Meilenstein",
  comment: "Kommentar",
  document: "Dokument",
  invoice: "Rechnung",
  user: "Benutzer",
};

function getActionInfo(action: string) {
  return ACTION_LABELS[action] ?? { label: action, emoji: "📝", color: "text-zinc-400" };
}

function LogItem({ log }: { log: ActivityLogItem }) {
  const actionInfo = getActionInfo(log.action);
  const entityLabel = ENTITY_LABELS[log.entityType] ?? log.entityType;
  const displayName = log.user?.name ?? log.userEmail ?? "System";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#222] last:border-0 hover:bg-[#1a1a1a] px-4 -mx-4 rounded-lg transition-colors">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 mt-0.5">
        {getInitials(displayName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 text-sm">
          <span className="font-medium text-white">{displayName}</span>
          <span className={`${actionInfo.color} text-xs`}>
            {actionInfo.emoji} {actionInfo.label}
          </span>
          <span className="text-zinc-400 text-xs">{entityLabel}:</span>
          <span className="text-zinc-300 text-xs font-medium truncate max-w-[200px]">
            {log.entityName}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {log.project && (
            <span
              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${log.project.color}15`,
                color: log.project.color,
              }}
            >
              {log.project.name}
            </span>
          )}
          <span className="text-[11px] text-zinc-600">
            {formatDistanceToNow(new Date(log.createdAt), { locale: de, addSuffix: true })}
          </span>
          <span className="text-[11px] text-zinc-700">
            {format(new Date(log.createdAt), "HH:mm", { locale: de })}
          </span>
        </div>
      </div>
    </div>
  );
}

function LogSection({
  title,
  icon: Icon,
  logs,
  selectedUserId,
}: {
  title: string;
  icon: React.ElementType;
  logs: ActivityLogItem[];
  selectedUserId: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const filtered = selectedUserId
    ? logs.filter((l) => l.userId === selectedUserId)
    : logs;

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 hover:bg-[#1e1e1e] transition-colors"
      >
        <Icon className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-xs text-zinc-600 ml-1">({filtered.length} Einträge)</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-600 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6">Keine Aktivitäten</p>
          ) : (
            <div>
              {filtered.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TeamActivityClient({ todayLogs, weekLogs, users }: Props) {
  const [selectedUserId, setSelectedUserId] = useState("");

  // Statistiken
  const allLogs = useMemo(() => [...todayLogs, ...weekLogs], [todayLogs, weekLogs]);
  const activeUserIds = useMemo(() => {
    const ids = new Set(allLogs.map((l) => l.userId).filter(Boolean));
    return ids;
  }, [allLogs]);

  const totalActions = todayLogs.length;
  const weekActions = allLogs.length;

  return (
    <div className="space-y-6">
      {/* Header-Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Aktionen heute", value: totalActions, icon: Clock, color: "text-emerald-400" },
          { label: "Aktionen diese Woche", value: weekActions, icon: Activity, color: "text-blue-400" },
          { label: "Aktive Teammitglieder", value: activeUserIds.size, icon: Users, color: "text-violet-400" },
          { label: "Gesamtmitglieder", value: users.length, icon: Users, color: "text-zinc-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-zinc-600 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">Filtern nach Mitarbeiter:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedUserId("")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              !selectedUserId
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-[#1c1c1c] border-[#2a2a2a] text-zinc-400 hover:border-[#3a3a3a]"
            }`}
          >
            Alle
          </button>
          {users
            .filter((u) => activeUserIds.has(u.id))
            .map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(selectedUserId === u.id ? "" : u.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedUserId === u.id
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#1c1c1c] border-[#2a2a2a] text-zinc-400 hover:border-[#3a3a3a]"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold">
                  {getInitials(u.name)}
                </span>
                {u.name}
              </button>
            ))}
        </div>
      </div>

      {/* Heute */}
      <LogSection
        title={`Heute — ${format(new Date(), "d. MMMM yyyy", { locale: de })}`}
        icon={Clock}
        logs={todayLogs}
        selectedUserId={selectedUserId}
      />

      {/* Diese Woche */}
      <LogSection
        title="Früher diese Woche"
        icon={Calendar}
        logs={weekLogs}
        selectedUserId={selectedUserId}
      />
    </div>
  );
}
