"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Megaphone, Pin, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-zinc-700 text-zinc-300" },
  wichtig: { label: "Wichtig", className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  dringend: { label: "Dringend", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function AnnouncementModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Announcement>;
  onSave: (data: { title: string; content: string; priority: string; pinned: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "normal");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold text-base">
            {initial?.id ? "Ankündigung bearbeiten" : "Neue Ankündigung"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ankündigung Titel..."
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Inhalt *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Inhalt der Ankündigung..."
              rows={6}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="normal">Normal</option>
                <option value="wichtig">Wichtig</option>
                <option value="dringend">Dringend</option>
              </select>
            </div>

            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setPinned(!pinned)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    pinned ? "bg-emerald-500" : "bg-zinc-700"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      pinned ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
                <span className="text-xs text-zinc-400">Anpinnen</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              if (!title.trim() || !content.trim()) return;
              onSave({ title, content, priority, pinned });
            }}
            disabled={!title.trim() || !content.trim()}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [meData, setMeData] = useState<{ role: string } | null>(null);

  const isAdmin = meData?.role === "admin";

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setMeData(data); })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setAnnouncements(await res.json());
    } catch (e) {
      setError("Ankündigungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (data: { title: string; content: string; priority: string; pinned: boolean }) => {
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowModal(false);
      fetchAnnouncements();
    }
  };

  const handleEdit = async (data: { title: string; content: string; priority: string; pinned: boolean }) => {
    if (!editItem) return;
    const res = await fetch(`/api/announcements/${editItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditItem(null);
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ankündigung wirklich löschen?")) return;
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    if (res.ok) fetchAnnouncements();
  };

  const handleTogglePin = async (a: Announcement) => {
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !a.pinned }),
    });
    if (res.ok) fetchAnnouncements();
  };

  return (
    <AppShell title="Ankündigungen" subtitle="Team-Nachrichten & Mitteilungen">
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Megaphone className="w-5 h-5" />
            <span className="text-sm">{announcements.length} Ankündigung(en)</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neue Ankündigung
            </button>
          )}
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-16 text-zinc-500">Laden...</div>
        )}
        {error && (
          <div className="text-center py-16 text-red-400">{error}</div>
        )}

        {/* Announcements */}
        {!loading && !error && announcements.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            Noch keine Ankündigungen vorhanden.
          </div>
        )}

        {!loading && !error && announcements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "bg-[#161616] border rounded-xl p-5 space-y-3 transition-all",
              a.pinned ? "border-emerald-500/40" : "border-[#2a2a2a]",
              a.priority === "dringend" && "border-red-500/40",
              a.priority === "wichtig" && !a.pinned && "border-yellow-500/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {a.pinned && (
                  <Pin className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <h3 className="text-white font-semibold text-base">{a.title}</h3>
                <PriorityBadge priority={a.priority} />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTogglePin(a)}
                    title={a.pinned ? "Anpinnen aufheben" : "Anpinnen"}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      a.pinned
                        ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    )}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditItem(a)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {a.content}
            </pre>

            <p className="text-xs text-zinc-600">
              {new Date(a.createdAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <AnnouncementModal
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editItem && (
        <AnnouncementModal
          initial={editItem}
          onSave={handleEdit}
          onClose={() => setEditItem(null)}
        />
      )}
    </AppShell>
  );
}
