"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, X, Trash2, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
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

interface ToastNotification {
  id: string;
  notification: Notification;
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        const notifs: Notification[] = data.notifications ?? [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount ?? 0);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
        // Bekannte IDs für SSE-Duplikat-Erkennung
        notifs.forEach((n) => knownIdsRef.current.add(n.id));
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
        const notifs: Notification[] = data.notifications ?? [];
        setNotifications((prev) => [...prev, ...notifs]);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
        notifs.forEach((n) => knownIdsRef.current.add(n.id));
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Toast anzeigen
  const showToast = useCallback((notification: Notification) => {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = { id: toastId, notification };
    setToasts((prev) => [...prev, newToast]);

    // Nach 3 Sekunden entfernen
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3000);
  }, []);

  // SSE-Verbindung aufbauen
  useEffect(() => {
    fetchNotifications();

    const connectSSE = () => {
      if (sseRef.current) {
        sseRef.current.close();
      }

      const es = new EventSource("/api/notifications/stream");
      sseRef.current = es;

      es.addEventListener("new_notifications", (event) => {
        try {
          const data = JSON.parse(event.data);
          const newNotifs: Notification[] = data.notifications ?? [];

          // Nur wirklich neue Notifications (nicht bereits bekannte)
          const unbekannt = newNotifs.filter((n) => !knownIdsRef.current.has(n.id));

          if (unbekannt.length > 0) {
            unbekannt.forEach((n) => {
              knownIdsRef.current.add(n.id);
              showToast(n);
            });

            setNotifications((prev) => [...unbekannt, ...prev]);
            setUnreadCount(data.unreadCount ?? 0);
          }
        } catch {}
      });

      es.addEventListener("badge_update", (event) => {
        try {
          const data = JSON.parse(event.data);
          setUnreadCount(data.unreadCount ?? 0);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        // Automatisch nach 15s reconnecten
        setTimeout(connectSSE, 15_000);
      };
    };

    connectSSE();

    return () => {
      sseRef.current?.close();
    };
  }, [fetchNotifications, showToast]);

  // Beim Öffnen des Panels neu laden
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Außerhalb klicken → schließen
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

  const dismissToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  return (
    <>
      {/* Toast Benachrichtigungen */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const dotColor = TYPE_COLORS[toast.notification.type] ?? "bg-zinc-500";
          const icon = TYPE_ICONS[toast.notification.type] ?? "•";
          const inner = (
            <div
              className="flex items-start gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl pointer-events-auto max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300 cursor-pointer"
              onClick={() => dismissToast(toast.id)}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5",
                  dotColor
                )}
              >
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-snug truncate">
                  {toast.notification.title}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2 leading-snug">
                  {toast.notification.message}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );

          return toast.notification.link ? (
            <Link key={toast.id} href={toast.notification.link} className="pointer-events-auto">
              {inner}
            </Link>
          ) : (
            <div key={toast.id}>{inner}</div>
          );
        })}
      </div>

      {/* Bell + Dropdown */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
          aria-label="Benachrichtigungen"
          data-tour="notifications"
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
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors p-0.5"
                  title="Alle Benachrichtigungen"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
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
                      className={cn(
                        "flex gap-3 px-4 py-3 hover:bg-[#222] transition-colors cursor-pointer group",
                        !n.read ? "bg-[#1e1e1e]" : ""
                      )}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                    >
                      <div className="pt-0.5 flex-shrink-0">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white",
                            dotColor
                          )}
                        >
                          {icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs font-medium leading-snug",
                              n.read ? "text-zinc-400" : "text-white"
                            )}
                          >
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}
                                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                title="Als gelesen markieren"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id, n.read); }}
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

              {hasMore && (
                <div className="px-4 py-2 border-t border-[#2a2a2a]">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full text-xs text-zinc-400 hover:text-white py-1.5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
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

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">
                {notifications.length} Benachrichtigungen
              </span>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
              >
                Alle anzeigen →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
