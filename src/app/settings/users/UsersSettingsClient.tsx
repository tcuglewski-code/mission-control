"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  Check,
  Loader2,
  Link2,
  UserX,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { MC_ROLES, type McRole } from "@/lib/permissions";

interface SettingsUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  mcRole: string;
  active: boolean;
  lastLoginAt?: string | null;
  permissions: string[];
  projectAccess: string[];
  createdAt: string;
  updatedAt: string;
}

function getRoleInfo(mcRole: string) {
  return MC_ROLES.find((r) => r.value === mcRole) ?? MC_ROLES[2];
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function UsersSettingsClient() {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Role change modal
  const [editModal, setEditModal] = useState<SettingsUser | null>(null);
  const [editMcRole, setEditMcRole] = useState<McRole>("entwickler");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, mcRole: McRole) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcRole }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      }
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleActive(user: SettingsUser) {
    setSaving(user.id);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
        );
      }
    } finally {
      setSaving(null);
    }
  }

  async function createInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail || undefined }),
      });
      const data = await res.json();
      if (data.link) setInviteLink(data.link);
    } finally {
      setInviteLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEditModal(user: SettingsUser) {
    setEditModal(user);
    setEditMcRole((user.mcRole as McRole) ?? "entwickler");
    setEditError(null);
  }

  async function saveEditModal() {
    if (!editModal) return;
    setSaving(editModal.id);
    setEditError(null);
    try {
      const res = await fetch(`/api/settings/users/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcRole: editMcRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError((err as any).error ?? "Fehler beim Speichern");
        return;
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === editModal.id ? { ...u, ...updated } : u)));
      setEditModal(null);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Benutzerverwaltung
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Benutzer, Rollen und Zugriffsrechte verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white text-sm rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setInviteModal(true);
              setInviteLink("");
              setInviteEmail("");
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Benutzer einladen
          </button>
        </div>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {MC_ROLES.map((role) => (
          <div
            key={role.value}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${role.bg} ${role.color}`}
          >
            <span>{role.label}</span>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                  Benutzer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Rolle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                  Letzte Aktivität
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleInfo = getRoleInfo(user.mcRole);
                const isSaving = saving === user.id;
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-100 dark:border-[#1e1e1e] hover:bg-gray-50 dark:hover:bg-[#1c1c1c] transition-colors ${
                      !user.active ? "opacity-50" : ""
                    }`}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            user.active
                              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                              : "bg-zinc-500/20 border border-zinc-500/30 text-zinc-500"
                          }`}
                        >
                          {getInitials(user.username)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </p>
                          {user.email && (
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleInfo.bg} ${roleInfo.color}`}
                      >
                        {user.mcRole === "admin" ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {roleInfo.label}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString("de-DE")
                          : user.updatedAt
                          ? new Date(user.updatedAt).toLocaleDateString("de-DE")
                          : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          user.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {user.active ? "Aktiv" : "Deaktiviert"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors"
                            >
                              Rolle ändern
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              title={user.active ? "Deaktivieren" : "Reaktivieren"}
                              className={`p-1.5 rounded transition-colors ${
                                user.active
                                  ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                  : "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {user.active ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                    Noch keine Benutzer vorhanden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── INVITE MODAL ── */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Benutzer einladen
              </h2>
              <button
                onClick={() => setInviteModal(false)}
                className="text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">
                  Erstelle einen Einladungslink und sende ihn an den neuen Benutzer.
                </p>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                    E-Mail (optional)
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="benutzer@example.com"
                  />
                </div>
                <button
                  onClick={createInvite}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {inviteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Einladungslink generieren
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-emerald-400 font-medium">
                    ✓ Link generiert (gültig für 7 Tage)
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 select-all"
                  />
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? "Kopiert!" : "Kopieren"}
                  </button>
                </div>
                <button
                  onClick={() => { setInviteLink(""); setInviteEmail(""); }}
                  className="w-full text-sm text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Weiteren Link erstellen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT ROLE MODAL ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Rolle ändern
              </h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-[#1c1c1c] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
                {getInitials(editModal.username)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{editModal.username}</p>
                {editModal.email && (
                  <p className="text-xs text-zinc-500">{editModal.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {MC_ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    editMcRole === role.value
                      ? `${role.bg} border-current`
                      : "bg-gray-50 dark:bg-[#1c1c1c] border-gray-200 dark:border-[#2a2a2a] hover:border-zinc-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="mcRole"
                    value={role.value}
                    checked={editMcRole === role.value}
                    onChange={() => setEditMcRole(role.value as McRole)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <p className={`text-sm font-medium ${role.color}`}>{role.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {role.value === "admin" && "Vollzugriff auf alle Funktionen"}
                      {role.value === "projektmanager" && "Projekte & Tasks verwalten, Berichte einsehen"}
                      {role.value === "entwickler" && "Eigene Tasks, Kommentare & Zeiterfassung"}
                      {role.value === "beobachter" && "Nur lesender Zugriff"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {editError && (
              <div className="text-red-400 text-sm p-2 bg-red-500/10 border border-red-500/20 rounded mb-3">
                ⚠️ {editError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white text-sm rounded-md transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={saveEditModal}
                disabled={saving === editModal.id}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {saving === editModal.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
