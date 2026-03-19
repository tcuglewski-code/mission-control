"use client";

import { useState } from "react";
import {
  Database,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
}

interface DbEntry {
  id: string;
  name: string;
  type: string;
  host: string | null;
  port: number | null;
  status: string;
  sizeBytes: string | null; // BigInt serialized as string
  lastBackup: string | null;
  lastChecked: string | null;
  projectId: string | null;
  project: Project | null;
  createdAt: string;
  updatedAt: string;
}

interface DatabasesClientProps {
  initialDatabases: DbEntry[];
  projects: Project[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_TYPES = [
  { value: "neon", label: "Neon (PostgreSQL)", emoji: "⚡" },
  { value: "postgresql", label: "PostgreSQL", emoji: "🐘" },
  { value: "mysql", label: "MySQL", emoji: "🐬" },
  { value: "mongodb", label: "MongoDB", emoji: "🍃" },
  { value: "watermelondb", label: "WatermelonDB", emoji: "🍉" },
  { value: "sqlite", label: "SQLite", emoji: "📦" },
  { value: "redis", label: "Redis", emoji: "🔴" },
];

const DB_TYPE_MAP: Record<string, { emoji: string; label: string }> = Object.fromEntries(
  DB_TYPES.map((t) => [t.value, { emoji: t.emoji, label: t.label }])
);

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string; badge: string }> = {
  connected: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    label: "Verbunden",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  disconnected: {
    icon: XCircle,
    color: "text-red-400",
    label: "Getrennt",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-zinc-400",
    label: "Unbekannt",
    badge: "bg-zinc-700/30 text-zinc-400 border-zinc-600/20",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: string | null): string {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n === 0) return "0 B";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyForm = {
  name: "",
  type: "postgresql",
  host: "",
  port: "",
  projectId: "",
  sizeBytes: "",
  lastBackup: "",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DatabasesClient({ initialDatabases, projects }: DatabasesClientProps) {
  const [databases, setDatabases] = useState<DbEntry[]>(initialDatabases);
  const [showModal, setShowModal] = useState(false);
  const [editDb, setEditDb] = useState<DbEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered =
    typeFilter === "all" ? databases : databases.filter((d) => d.type === typeFilter);

  const openCreate = () => {
    setEditDb(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (db: DbEntry) => {
    setEditDb(db);
    setForm({
      name: db.name,
      type: db.type,
      host: db.host ?? "",
      port: db.port?.toString() ?? "",
      projectId: db.projectId ?? "",
      sizeBytes: db.sizeBytes ?? "",
      lastBackup: db.lastBackup ? db.lastBackup.slice(0, 16) : "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        host: form.host || null,
        port: form.port ? Number(form.port) : null,
        projectId: form.projectId || null,
        sizeBytes: form.sizeBytes || null,
        lastBackup: form.lastBackup || null,
      };

      if (editDb) {
        const res = await fetch(`/api/databases/${editDb.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setDatabases(databases.map((d) => (d.id === editDb.id ? updated : d)));
        }
      } else {
        const res = await fetch("/api/databases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setDatabases([...databases, created]);
        }
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (db: DbEntry) => {
    if (!confirm(`"${db.name}" wirklich entfernen?`)) return;
    const res = await fetch(`/api/databases/${db.id}`, { method: "DELETE" });
    if (res.ok) setDatabases(databases.filter((d) => d.id !== db.id));
  };

  const handleHealthCheck = async (db: DbEntry) => {
    setCheckingId(db.id);
    try {
      const res = await fetch(`/api/databases/${db.id}/health-check`, { method: "POST" });
      if (res.ok) {
        const { db: updated } = await res.json();
        setDatabases(databases.map((d) => (d.id === db.id ? updated : d)));
      }
    } finally {
      setCheckingId(null);
    }
  };

  const usedTypes = Array.from(new Set(databases.map((d) => d.type)));

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Datenbanken
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {databases.length} {databases.length === 1 ? "Datenbank" : "Datenbanken"} verwaltet
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Neue Datenbank
        </button>
      </div>

      {/* ── Type Filter ── */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={cn(
            "px-2.5 py-1.5 text-xs rounded-lg transition-colors",
            typeFilter === "all" ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white"
          )}
        >
          Alle
        </button>
        {usedTypes.map((t) => {
          const info = DB_TYPE_MAP[t] ?? { emoji: "🗄️", label: t };
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2.5 py-1.5 text-xs rounded-lg transition-colors",
                typeFilter === t ? "bg-[#252525] text-white" : "text-zinc-500 hover:text-white"
              )}
            >
              {info.emoji} {info.label}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Database className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Datenbanken gefunden</p>
          <button
            onClick={openCreate}
            className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Erste Datenbank hinzufügen →
          </button>
        </div>
      ) : (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Name</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Typ</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Host:Port</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Größe</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Letztes Backup</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Zuletzt geprüft</th>
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Projekt</th>
                  <th className="text-right text-zinc-500 font-medium px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((db) => {
                  const typeInfo = DB_TYPE_MAP[db.type] ?? { emoji: "🗄️", label: db.type };
                  const statusCfg = STATUS_CONFIG[db.status] ?? STATUS_CONFIG.unknown;
                  const StatusIcon = statusCfg.icon;
                  const isChecking = checkingId === db.id;

                  return (
                    <tr
                      key={db.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1e1e1e] transition-colors group"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{db.name}</span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <span>{typeInfo.emoji}</span>
                          <span>{typeInfo.label}</span>
                        </span>
                      </td>

                      {/* Host:Port */}
                      <td className="px-4 py-3 text-zinc-400 font-mono">
                        {db.host
                          ? `${db.host}${db.port ? `:${db.port}` : ""}`
                          : <span className="text-zinc-600">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium",
                            statusCfg.badge
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 text-zinc-400">{formatBytes(db.sizeBytes)}</td>

                      {/* Last Backup */}
                      <td className="px-4 py-3 text-zinc-400">{formatDate(db.lastBackup)}</td>

                      {/* Last Checked */}
                      <td className="px-4 py-3 text-zinc-400">{formatDate(db.lastChecked)}</td>

                      {/* Project */}
                      <td className="px-4 py-3">
                        {db.project ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: db.project.color }}
                            />
                            <span className="text-zinc-300 truncate max-w-[100px]">
                              {db.project.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleHealthCheck(db)}
                            disabled={isChecking}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50"
                            title="Health Check"
                          >
                            {isChecking ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Activity className="w-3 h-3" />
                            )}
                            Check
                          </button>
                          <button
                            onClick={() => openEdit(db)}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-[#252525] rounded transition-colors"
                            title="Bearbeiten"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(db)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                {editDb ? "Datenbank bearbeiten" : "Neue Datenbank"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z.B. Mission Control DB"
                  required
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Typ *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {DB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Host</label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="db.example.com"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Port</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    placeholder="5432"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Projekt (optional)</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">Kein Projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size + Last Backup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Größe (Bytes)</label>
                  <input
                    type="number"
                    value={form.sizeBytes}
                    onChange={(e) => setForm({ ...form, sizeBytes: e.target.value })}
                    placeholder="524288000"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Letztes Backup</label>
                  <input
                    type="datetime-local"
                    value={form.lastBackup}
                    onChange={(e) => setForm({ ...form, lastBackup: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
                >
                  {loading ? "Speichern..." : editDb ? "Aktualisieren" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
