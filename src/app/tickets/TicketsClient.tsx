"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Tag,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Ticket as TicketIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; color: string }
interface Assignee { id: string; name: string; avatar: string | null }

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  projectId: string | null;
  project: Project | null;
  assigneeId: string | null;
  assignee: Assignee | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketsClientProps {
  initialTickets: Ticket[];
  projects: Project[];
  users: { id: string; name: string; avatar: string | null }[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  open:        { label: "Offen",       badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  in_progress: { label: "In Arbeit",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  resolved:    { label: "Gelöst",      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed:      { label: "Geschlossen", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-600/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:      { label: "Niedrig",   color: "text-zinc-400" },
  medium:   { label: "Mittel",    color: "text-blue-400" },
  high:     { label: "Hoch",      color: "text-amber-400" },
  critical: { label: "Kritisch",  color: "text-red-400" },
};

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  bug:      { label: "Bug",       emoji: "🐛" },
  feature:  { label: "Feature",   emoji: "✨" },
  support:  { label: "Support",   emoji: "🎧" },
  question: { label: "Frage",     emoji: "❓" },
};

const STATUSES = Object.entries(STATUS_CONFIG).map(([value, c]) => ({ value, label: c.label }));
const PRIORITIES = Object.entries(PRIORITY_CONFIG).map(([value, c]) => ({ value, label: c.label }));
const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([value, c]) => ({ value, label: `${c.emoji} ${c.label}` }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TicketFormProps {
  ticket?: Ticket;
  projects: Project[];
  users: { id: string; name: string; avatar: string | null }[];
  onClose: () => void;
  onSave: (ticket: Ticket) => void;
}

function TicketModal({ ticket, projects, users, onClose, onSave }: TicketFormProps) {
  const [form, setForm] = useState({
    title: ticket?.title ?? "",
    description: ticket?.description ?? "",
    status: ticket?.status ?? "open",
    priority: ticket?.priority ?? "medium",
    category: ticket?.category ?? "",
    projectId: ticket?.projectId ?? "",
    assigneeId: ticket?.assigneeId ?? "",
    taskId: ticket?.taskId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!ticket;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titel ist erforderlich"); return; }
    setSaving(true);
    setError("");

    const body = {
      title: form.title.trim(),
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      category: form.category || undefined,
      projectId: form.projectId || undefined,
      assigneeId: form.assigneeId || undefined,
      taskId: form.taskId || undefined,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/tickets/${ticket.id}` : "/api/tickets",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const saved: Ticket = await res.json();
      onSave(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? "Ticket bearbeiten" : "Neues Ticket"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Titel *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ticket-Titel"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Details zum Ticket..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Priorität</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Keine</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Projekt</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Keines</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Zugewiesen an</label>
            <select
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Niemand</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? "Speichere..." : isEdit ? "Speichern" : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function TicketDetail({ ticket, onClose, onEdit, onDelete }: {
  ticket: Ticket;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_CONFIG[ticket.status] ?? { label: ticket.status, badge: "bg-zinc-700 text-zinc-300" };
  const priority = PRIORITY_CONFIG[ticket.priority] ?? { label: ticket.priority, color: "text-zinc-400" };
  const category = ticket.category ? (CATEGORY_CONFIG[ticket.category] ?? { label: ticket.category, emoji: "📌" }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", status.badge)}>
                {status.label}
              </span>
              {category && (
                <span className="text-xs text-zinc-400">{category.emoji} {category.label}</span>
              )}
            </div>
            <h2 className="text-base font-semibold text-white">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {ticket.description && (
            <p className="text-sm text-zinc-300 leading-relaxed">{ticket.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-500 text-xs">Priorität</span>
              <p className={cn("font-medium", priority.color)}>{priority.label}</p>
            </div>
            {ticket.project && (
              <div>
                <span className="text-zinc-500 text-xs">Projekt</span>
                <p className="text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.project.color }} />
                  {ticket.project.name}
                </p>
              </div>
            )}
            {ticket.assignee && (
              <div>
                <span className="text-zinc-500 text-xs">Zugewiesen an</span>
                <p className="text-white">{ticket.assignee.name}</p>
              </div>
            )}
            <div>
              <span className="text-zinc-500 text-xs">Erstellt</span>
              <p className="text-zinc-300">{formatDate(ticket.createdAt)}</p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Bearbeiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TicketsClient({ initialTickets, projects, users }: TicketsClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    return true;
  });

  function handleSave(saved: Ticket) {
    setTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowModal(false);
    setEditTicket(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Ticket wirklich löschen?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((t) => t.id !== id));
      setDetailTicket(null);
    } finally {
      setDeleting(null);
    }
  }

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s.value, tickets.filter((t) => t.status === s.value).length])
  );

  return (
    <>
      {/* Modals */}
      {(showModal || editTicket) && (
        <TicketModal
          ticket={editTicket ?? undefined}
          projects={projects}
          users={users}
          onClose={() => { setShowModal(false); setEditTicket(null); }}
          onSave={handleSave}
        />
      )}
      {detailTicket && !editTicket && (
        <TicketDetail
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
          onEdit={() => { setEditTicket(detailTicket); setDetailTicket(null); }}
          onDelete={() => handleDelete(detailTicket.id)}
        />
      )}

      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-blue-400" />
              Tickets
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{tickets.length} Tickets gesamt</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neues Ticket
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s.value];
            return (
              <button
                key={s.value}
                onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                className={cn(
                  "bg-zinc-900 border rounded-xl p-4 text-left transition-all",
                  filterStatus === s.value
                    ? "border-blue-500/50 ring-1 ring-blue-500/30"
                    : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <p className="text-2xl font-bold text-white">{counts[s.value] ?? 0}</p>
                <p className={cn("text-xs mt-0.5 font-medium", cfg.badge.split(" ").find(c => c.startsWith("text-")))}>
                  {cfg.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="all">Alle Status</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="all">Alle Projekte</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(filterStatus !== "all" || filterProject !== "all") && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterProject("all"); }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <TicketIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Keine Tickets gefunden</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400">Titel</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 hidden sm:table-cell">Priorität</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 hidden md:table-cell">Kategorie</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 hidden lg:table-cell">Projekt</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 hidden lg:table-cell">Zugewiesen</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 hidden xl:table-cell">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => {
                  const status = STATUS_CONFIG[ticket.status] ?? { label: ticket.status, badge: "bg-zinc-700 text-zinc-300 border-zinc-600" };
                  const priority = PRIORITY_CONFIG[ticket.priority] ?? { label: ticket.priority, color: "text-zinc-400" };
                  const category = ticket.category ? (CATEGORY_CONFIG[ticket.category] ?? { label: ticket.category, emoji: "📌" }) : null;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setDetailTicket(ticket)}
                      className={cn(
                        "border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/50 cursor-pointer transition-colors",
                        deleting === ticket.id && "opacity-50 pointer-events-none"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white truncate max-w-xs">{ticket.title}</p>
                        {ticket.description && (
                          <p className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">{ticket.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", status.badge)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn("text-sm font-medium", priority.color)}>{priority.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {category ? (
                          <span className="text-xs text-zinc-300">{category.emoji} {category.label}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {ticket.project ? (
                          <span className="flex items-center gap-1.5 text-zinc-300 text-xs">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ticket.project.color }} />
                            {ticket.project.name}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-zinc-400 text-xs">
                        {ticket.assignee?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-zinc-500 text-xs">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
