"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Bell, CheckCheck, Trash2, Check, Filter, Settings2,
  Loader2, BellOff, RefreshCw, X, Save
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isThisWeek } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  task_assigned: "bg-green-500",
  task_status_changed: "bg-blue-500",
  comment_added: "bg-indigo-500",
  milestone_due: "bg-orange-500",
  sprint_completed: "bg-violet-500",
  mention: "bg-amber-500",
  new_email: "bg-sky-500",
  task_update: "bg-blue-500",
  deadline: "bg-red-500",
  cron_result: "bg-violet-500",
};

const TYPE_ICONS: Record<string, string> = {
  task_assigned: "📋",
  task_status_changed: "🔄",
  comment_added: "💬",
  milestone_due: "🏁",
  sprint_completed: "✅",
  mention: "@",
  new_email: "📧",
  task_update: "🔄",
  deadline: "⏰",
  cron_result: "⚙️",
};

const TYPE_LABELS: Record<string, string> = {
  task_assigned: "Task",
  task_status_changed: "Task",
  comment_added: "Kommentar",
  milestone_due: "Meilenstein",
  sprint_completed: "Meilenstein",
  mention: "Erwähnung",
  new_email: "E-Mail",
  task_update: "Task",
  deadline: "Deadline",
  cron_result: "System",
};

type FilterType = "alle" | "ungelesen" | "task" | "kommentar" | "meilenstein" | "deadline" | "erwaehnung";

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "ungelesen", label: "Ungelesen" },
  { id: "task", label: "Task" },
  { id: "kommentar", label: "Kommentar" },
  { id: "meilenstein", label: "Meilenstein" },
  { id: "deadline", label: "Deadline" },
  { id: "erwaehnung", label: "Erwähnung" },
];

const TYPE_TO_FILTER: Record<string, FilterType> = {
  task_assigned: "task",
  task_status_changed: "task",
  task_update: "task",
  comment_added: "kommentar",
  milestone_due: "meilenstein",
  sprint_completed: "meilenstein",
  mention: "erwaehnung",
  new_email: "kommentar",
  deadline: "deadline",
  cron_result: "task",
};

function groupByDate(notifications: Notification[]) {
  const heute: Notification[] = [];
  const dieseWoche: Notification[] = [];
  const aelter: Notification[] = [];

  for (const n of notifications) {
    const date = new Date(n.createdAt);
    if (isToday(date)) {
      heute.push(n);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      dieseWoche.push(n);
    } else {
      aelter.push(n);
    }
  }

  return { heute, dieseWoche, aelter };
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("alle");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDigest, setSettingsDigest] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch (e) {
      console.error("Fehler beim Laden", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?limit=50&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setSettingsDigest(data.notifEmailDigest ?? true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    loadSettings();
  }, [fetchNotifications, loadSettings]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteNotification = async (id: string, wasRead: boolean) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!wasRead) setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const deleteAll = async () => {
    if (!confirm("Alle Benachrichtigungen löschen?")) return;
    setActionLoading(true);
    try {
      await fetch("/api/notifications/delete-all", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setActionLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifEmailDigest: settingsDigest }),
      });
    } catch {}
    setSavingSettings(false);
  };

  // Filtern
  const filtered = notifications.filter((n) => {
    if (activeFilter === "alle") return true;
    if (activeFilter === "ungelesen") return !n.read;
    return TYPE_TO_FILTER[n.type] === activeFilter;
  });

  const { heute, dieseWoche, aelter } = groupByDate(filtered);

  const renderNotification = (n: Notification) => {
    const dotColor = TYPE_COLORS[n.type] ?? "bg-zinc-500";
    const icon = TYPE_ICONS[n.type] ?? "•";

    const content = (
      <div
        className={cn(
          "flex gap-4 px-5 py-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer group",
          !n.read && "bg-[#161b16] border-l-2 border-l-emerald-500/60"
        )}
        onClick={() => { if (!n.read) markRead(n.id); }}
      >
        <div className="pt-0.5 flex-shrink-0">
          <span
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
              dotColor
            )}
          >
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={cn("text-sm font-medium leading-snug", n.read ? "text-zinc-400" : "text-white")}>
                {n.title}
              </p>
              <p className="text-xs text-zinc-500 mt-1 leading-snug">{n.message}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-zinc-600">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: de })}
                </span>
                <span className="text-[10px] text-zinc-700">·</span>
                <span className="text-[10px] text-zinc-600">{TYPE_LABELS[n.type] ?? n.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {!n.read && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}
                  className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                  title="Als gelesen markieren"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id, n.read); }}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return n.link ? (
      <Link key={n.id} href={n.link}>{content}</Link>
    ) : (
      <div key={n.id}>{content}</div>
    );
  };

  const renderGroup = (label: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-5 py-2 bg-[#111] border-b border-[#222]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {label}
          </span>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {items.map(renderNotification)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0">
          {/* Filter-Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors",
                  activeFilter === tab.id
                    ? "bg-emerald-600 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-[#1c1c1c]"
                )}
              >
                {tab.label}
                {tab.id === "ungelesen" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#1c1c1c] rounded transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
                title="Alle als gelesen markieren"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alle gelesen</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAll}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                title="Alle löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alle löschen</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={cn(
                "p-1.5 rounded transition-colors",
                showSettings
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "text-zinc-500 hover:text-white hover:bg-[#1c1c1c]"
              )}
              title="Einstellungen"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Lade Benachrichtigungen…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <BellOff className="w-10 h-10 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Keine Benachrichtigungen</p>
              {activeFilter !== "alle" && (
                <button
                  onClick={() => setActiveFilter("alle")}
                  className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Alle anzeigen
                </button>
              )}
            </div>
          ) : (
            <div>
              {renderGroup("Heute", heute)}
              {renderGroup("Diese Woche", dieseWoche)}
              {renderGroup("Älter", aelter)}

              {hasMore && (
                <div className="px-5 py-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white bg-[#1c1c1c] hover:bg-[#252525] rounded-md transition-colors flex items-center gap-2 mx-auto"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Lade…</>
                    ) : (
                      "Mehr laden"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Einstellungen-Panel */}
      {showSettings && (
        <div className="w-72 border-l border-[#2a2a2a] bg-[#0f0f0f] flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-zinc-400" />
              Einstellungen
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* E-Mail Digest */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                E-Mail Digest
              </h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer group">
                  <div>
                    <p className="text-sm text-zinc-300">Täglicher Digest</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Tägliche Zusammenfassung per E-Mail (07:00 Uhr)
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsDigest}
                    onClick={() => setSettingsDigest((s) => !s)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
                      settingsDigest ? "bg-emerald-600" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                        settingsDigest ? "translate-x-4" : "translate-x-1"
                      )}
                    />
                  </button>
                </label>
              </div>
            </div>

            {/* Push-Benachrichtigungen */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Benachrichtigungs-Typen
              </h4>
              <div className="space-y-2">
                {[
                  { label: "Task-Zuweisungen", desc: "Wenn dir ein Task zugewiesen wird" },
                  { label: "Kommentare", desc: "Bei neuen Kommentaren auf deine Tasks" },
                  { label: "Meilensteine", desc: "Fällige Meilensteine und Deadlines" },
                  { label: "Erwähnungen", desc: "Wenn du @erwähnt wirst" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 py-2 border-b border-[#1a1a1a] last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-zinc-300">{item.label}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" title="Aktiv" />
                  </div>
                ))}
              </div>
            </div>

            {/* Digest-Vorschau Link */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Vorschau
              </h4>
              <Link
                href="/settings/notifications/digest-preview"
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#222] rounded-lg transition-colors border border-[#2a2a2a] hover:border-[#333]"
              >
                <Bell className="w-3.5 h-3.5 flex-shrink-0" />
                E-Mail Digest Vorschau anzeigen
              </Link>
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {savingSettings ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Speichern…</>
              ) : (
                <><Save className="w-3.5 h-3.5" />Einstellungen speichern</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
