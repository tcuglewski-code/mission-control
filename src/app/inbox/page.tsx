"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Mail,
  MailOpen,
  Plus,
  Trash2,
  X,
  CheckSquare,
  Clock,
  RefreshCw,
  Search,
  Tag,
  Eye,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface InboxTask {
  id: string;
  title: string;
  status: string;
}

interface InboxEmail {
  id: string;
  from: string;
  subject: string;
  body: string | null;
  preview: string | null;
  receivedAt: string;
  read: boolean;
  taskCreated: boolean;
  tasks: InboxTask[];
}

// ─── Neue Email Form ──────────────────────────────────────────────────────────
interface NewEmailFormProps {
  onClose: () => void;
  onSaved: () => void;
}

function NewEmailForm({ onClose, onSaved }: NewEmailFormProps) {
  const [form, setForm] = useState({
    from: "",
    subject: "",
    body: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from.trim() || !form.subject.trim()) {
      setError("Absender und Betreff sind Pflichtfelder.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inbox/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: form.from.trim(),
          subject: form.subject.trim(),
          body: form.body.trim() || null,
          preview: form.body.trim().slice(0, 200) || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            E-Mail simulieren
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Von <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
              placeholder="absender@beispiel.de"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Betreff <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder='z.B. "[TASK] Aufgabe erledigen" oder normaler Betreff'
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Tipp: Betreff mit <code className="text-zinc-400">[TASK]</code> → automatisch als Task anlegen
            </p>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Nachrichtentext</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Nachrichteninhalt (optional)…"
              rows={5}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              E-Mail empfangen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Email-Detail / Task anlegen Dialog ──────────────────────────────────────
interface EmailDetailProps {
  email: InboxEmail;
  onClose: () => void;
  onTaskCreated: () => void;
}

function EmailDetail({ email, onClose, onTaskCreated }: EmailDetailProps) {
  const [taskForm, setTaskForm] = useState({
    title: email.subject,
    description: email.body
      ? `**Von:** ${email.from}\n**Betreff:** ${email.subject}\n\n---\n\n${email.body}`
      : `Von: ${email.from}\nBetreff: ${email.subject}`,
    priority: "medium",
    status: "todo",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setCreatingTask(true);
    setTaskError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          status: taskForm.status,
          priority: taskForm.priority,
          sourceEmailId: email.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setTaskError(data.error ?? "Fehler beim Erstellen");
        return;
      }
      onTaskCreated();
      onClose();
    } catch {
      setTaskError("Netzwerkfehler");
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3 min-w-0">
            <MailOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">{email.subject}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Von: {email.from}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {!email.taskCreated && (
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-lg text-xs transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Als Task anlegen
              </button>
            )}
            {email.taskCreated && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/50 text-zinc-400 rounded-lg text-xs">
                <Tag className="w-3 h-3" />
                Task bereits erstellt
              </span>
            )}
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(email.receivedAt), "dd.MM.yyyy HH:mm", { locale: de })}
            </span>
          </div>

          {/* Bestehende Tasks */}
          {email.tasks.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Verknüpfte Tasks:
              </p>
              <ul className="space-y-1">
                {email.tasks.map((t) => (
                  <li key={t.id} className="text-xs text-zinc-300">
                    • {t.title}{" "}
                    <span className="text-zinc-500">({t.status})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* E-Mail Body */}
          {email.body ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-4">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {email.body}
              </pre>
            </div>
          ) : email.preview ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-4">
              <p className="text-sm text-zinc-400 italic">{email.preview}</p>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-lg p-4 text-center text-zinc-600 text-sm">
              Kein Nachrichteninhalt
            </div>
          )}

          {/* Task-Formular */}
          {showTaskForm && (
            <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Task aus E-Mail erstellen
              </h3>
              <form onSubmit={handleCreateTask} className="space-y-3">
                {taskError && (
                  <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {taskError}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Titel</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">Offen</option>
                      <option value="in_progress">In Bearbeitung</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Priorität</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors"
                    >
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                      <option value="urgent">Dringend</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Beschreibung</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {creatingTask ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5" />
                    )}
                    Task erstellen
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Haupt-Seite ──────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inbox/emails");
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Emails:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const markRead = async (id: string) => {
    await fetch(`/api/inbox/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: true } : e))
    );
  };

  const deleteEmail = async (id: string) => {
    if (!confirm("E-Mail wirklich löschen?")) return;
    await fetch(`/api/inbox/emails/${id}`, { method: "DELETE" });
    setEmails((prev) => prev.filter((e) => e.id !== id));
  };

  const handleOpenEmail = async (email: InboxEmail) => {
    setSelectedEmail(email);
    if (!email.read) {
      await markRead(email.id);
    }
  };

  const handleTaskCreated = () => {
    fetchEmails();
  };

  const filtered = emails.filter((e) => {
    const matchesSearch =
      !search ||
      e.subject.toLowerCase().includes(search.toLowerCase()) ||
      e.from.toLowerCase().includes(search.toLowerCase()) ||
      (e.preview ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filterUnread || !e.read;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = emails.filter((e) => !e.read).length;

  return (
    <AppShell title="Posteingang">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <Mail className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                Posteingang
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-500">
                E-Mails empfangen und als Tasks anlegen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmails}
              className="p-2 text-zinc-500 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              E-Mail simulieren
            </button>
          </div>
        </div>

        {/* Filter & Suche */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Betreff, Absender oder Vorschau suchen…"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border",
              filterUnread
                ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                : "bg-[#111] text-zinc-500 border-[#2a2a2a] hover:text-white"
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            Nur ungelesen
          </button>
        </div>

        {/* E-Mail Liste */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Lade E-Mails…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-600">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search || filterUnread
                  ? "Keine E-Mails gefunden"
                  : "Posteingang ist leer"}
              </p>
              {!search && !filterUnread && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + E-Mail simulieren
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[#1e1e1e]">
              {filtered.map((email) => (
                <li
                  key={email.id}
                  className={cn(
                    "group flex items-start gap-4 px-5 py-4 hover:bg-[#161616] transition-colors cursor-pointer",
                    !email.read && "bg-[#131313]"
                  )}
                  onClick={() => handleOpenEmail(email)}
                >
                  {/* Ungelesen-Indikator */}
                  <div className="flex-shrink-0 pt-1">
                    {email.read ? (
                      <MailOpen className="w-4.5 h-4.5 text-zinc-600" />
                    ) : (
                      <Mail className="w-4.5 h-4.5 text-blue-400" />
                    )}
                  </div>

                  {/* Inhalt */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-sm truncate",
                          email.read ? "text-zinc-400" : "text-white font-medium"
                        )}
                      >
                        {email.subject}
                      </span>
                      {/* Task-Badge */}
                      {email.taskCreated && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-full">
                          <CheckSquare className="w-2.5 h-2.5" />
                          Task
                        </span>
                      )}
                      {/* Ungelesen-Punkt */}
                      {!email.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      <span className="text-zinc-400">{email.from}</span>
                      {email.preview && ` — ${email.preview}`}
                    </p>
                  </div>

                  {/* Rechts: Datum + Aktionen */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-[11px] text-zinc-600">
                      {formatDistanceToNow(new Date(email.receivedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEmail(email);
                        }}
                        className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors"
                        title="Öffnen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmail(email.id);
                        }}
                        className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stats */}
        {emails.length > 0 && (
          <p className="text-xs text-zinc-600 text-right">
            {filtered.length} von {emails.length} E-Mails · {unreadCount} ungelesen ·{" "}
            {emails.filter((e) => e.taskCreated).length} als Task angelegt
          </p>
        )}
      </div>

      {/* Modals */}
      {showNewForm && (
        <NewEmailForm
          onClose={() => setShowNewForm(false)}
          onSaved={fetchEmails}
        />
      )}

      {selectedEmail && (
        <EmailDetail
          email={selectedEmail}
          onClose={() => {
            setSelectedEmail(null);
            fetchEmails();
          }}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </AppShell>
  );
}
