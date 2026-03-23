"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
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
  task_update: "bg-blue-500",
  deadline: "bg-red-500",
  cron_result: "bg-violet-500",
  mention: "bg-amber-500",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

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
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const displayedNotifications = notifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
        aria-label="Notifications"
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
          <div className="max-h-96 overflow-y-auto divide-y divide-[#222]">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                Lade...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                Keine Benachrichtigungen
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const dotColor = TYPE_COLORS[n.type] ?? "bg-zinc-500";
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 hover:bg-[#222] transition-colors cursor-pointer ${
                      !n.read ? "bg-[#1e1e1e]" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                    }}
                  >
                    <div className="pt-1 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full block ${dotColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium ${n.read ? "text-zinc-400" : "text-white"} leading-snug`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                            className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                            title="Als gelesen markieren"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
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
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#2a2a2a] text-center">
              <span className="text-[10px] text-zinc-600">
                Letzte {Math.min(notifications.length, 10)} von {notifications.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
