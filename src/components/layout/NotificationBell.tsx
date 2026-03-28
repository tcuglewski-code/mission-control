"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, X, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

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
  // Legacy
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
  task_update: "🔄",
  deadline: "⏰",
  cron_result: "⚙️",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?limit=10&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch (e) {
      console.error("Failed to load more notifications", e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Beim Öffnen des Panels neu laden
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string, wasRead: boolean) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!wasRead) setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-white">Benachrichtigungen</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  title="Alle als gelesen markieren"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Alle gelesen</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[#222]">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Lade…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                Keine Benachrichtigungen
              </div>
            ) : (
              notifications.map((n) => {
                const dotColor = TYPE_COLORS[n.type] ?? "bg-zinc-500";
                const icon = TYPE_ICONS[n.type] ?? "•";
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 hover:bg-[#222] transition-colors cursor-pointer group ${
                      !n.read ? "bg-[#1e1e1e]" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                    }}
                  >
                    <div className="pt-0.5 flex-shrink-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${dotColor}`}
                      >
                        {icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-medium ${
                            n.read ? "text-zinc-400" : "text-white"
                          } leading-snug`}
                        >
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              className="text-zinc-600 hover:text-zinc-300 transition-colors"
                              title="Als gelesen markieren"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification(n.id, n.read);
                            }}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}

            {/* Mehr laden */}
            {hasMore && (
              <div className="px-4 py-2 border-t border-[#2a2a2a]">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-xs text-zinc-400 hover:text-white py-1.5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Lade…
                    </>
                  ) : (
                    "Mehr laden"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && !hasMore && (
            <div className="px-4 py-2 border-t border-[#2a2a2a] text-center">
              <span className="text-[10px] text-zinc-600">
                {notifications.length} Benachrichtigungen geladen
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
