"use client";

import { useEffect, useState } from "react";
import {
  Trash2,
  UserPlus,
  Link2,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  Check,
  Loader2,
  Key,
  Copy,
  Plus,
} from "lucide-react";

interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  projectAccess: string[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  username: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

type Tab = "users" | "api-keys";

export function AdminUsersClient() {
  const [tab, setTab] = useState<Tab>("users");

  // ── Users State ──
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [editAccess, setEditAccess] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── API Keys State ──
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [createKeyModal, setCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyUserId, setNewKeyUserId] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKeyValue, setCreatedKeyValue] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tab === "api-keys") loadApiKeys();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    const [usersRes, projectsRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/projects"),
    ]);
    setUsers(await usersRes.json());
    setProjects(await projectsRes.json());
    setLoading(false);
  }

  async function loadApiKeys() {
    setKeysLoading(true);
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) setApiKeys(await res.json());
    setKeysLoading(false);
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`User "${username}" wirklich löschen?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  async function createInvite() {
    setInviteLoading(true);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail || undefined }),
    });
    const data = await res.json();
    setInviteLoading(false);
    if (data.link) setInviteLink(data.link);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setSaving(true);
    await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, projectAccess: editAccess }),
    });
    setSaving(false);
    setEditingUser(null);
    loadData();
  }

  function openEdit(user: AuthUser) {
    setEditingUser(user);
    setEditRole(user.role);
    setEditAccess(user.projectAccess);
  }

  function toggleProject(id: string) {
    setEditAccess((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function createApiKey() {
    if (!newKeyName || !newKeyUserId) return;
    setCreatingKey(true);
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newKeyName,
        userId: newKeyUserId,
        expiresAt: newKeyExpiry || undefined,
      }),
    });
    const data = await res.json();
    setCreatingKey(false);
    if (res.ok && data.key) {
      setCreatedKeyValue(data.key);
      loadApiKeys();
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(createdKeyValue);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  async function deleteApiKey(id: string, name: string) {
    if (!confirm(`API-Key "${name}" wirklich löschen?`)) return;
    await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((k) => k.filter((x) => x.id !== id));
  }

  function resetKeyModal() {
    setCreateKeyModal(false);
    setNewKeyName("");
    setNewKeyUserId("");
    setNewKeyExpiry("");
    setCreatedKeyValue("");
    setKeyCopied(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Benutzerverwaltung</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Benutzer, Rollen und API-Keys verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadData(); if (tab === "api-keys") loadApiKeys(); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {tab === "users" && (
            <button
              onClick={() => {
                setInviteModal(true);
                setInviteLink("");
                setInviteEmail("");
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Einladung erstellen
            </button>
          )}
          {tab === "api-keys" && (
            <button
              onClick={() => setCreateKeyModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Neuen API-Key erstellen
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#2a2a2a]">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "users"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Benutzer
        </button>
        <button
          onClick={() => setTab("api-keys")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "api-keys"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          API-Keys
        </button>
      </div>

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                    Benutzername
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Rolle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                    Projektzugang
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                    Erstellt
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#1e1e1e] hover:bg-[#1c1c1c] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{user.username}</p>
                          {user.email && (
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">
                        {user.role === "admin"
                          ? "Alle Projekte"
                          : user.projectAccess.length === 0
                          ? "Kein Zugang"
                          : `${user.projectAccess.length} Projekte`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">
                        {new Date(user.createdAt).toLocaleDateString("de-DE")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-[#252525] transition-colors"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
                          className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-zinc-500"
                    >
                      Noch keine Benutzer
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── API KEYS TAB ── */}
      {tab === "api-keys" && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-300">
              <span className="font-medium">API-Keys</span> ermöglichen externen KI-Agenten den
              Zugriff auf die Mission Control API. Verwende den Header:{" "}
              <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono">
                Authorization: Bearer mc_live_...
              </code>
            </p>
          </div>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {keysLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Prefix</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                      Zuletzt genutzt
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                      Erstellt
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-[#1e1e1e] hover:bg-[#1c1c1c] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-sm text-white font-medium">{k.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-300">{k.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-zinc-400 bg-[#1c1c1c] border border-[#2a2a2a] px-2 py-0.5 rounded font-mono">
                          {k.keyPrefix}...
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          {k.lastUsedAt
                            ? new Date(k.lastUsedAt).toLocaleString("de-DE")
                            : "Noch nie"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          {new Date(k.createdAt).toLocaleDateString("de-DE")}
                          {k.expiresAt && (
                            <span className="ml-1 text-amber-500">
                              (läuft ab: {new Date(k.expiresAt).toLocaleDateString("de-DE")})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteApiKey(k.id, k.name)}
                          className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-zinc-500"
                      >
                        Noch keine API-Keys vorhanden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                Einladungslink erstellen
              </h2>
              <button
                onClick={() => setInviteModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!inviteLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    E-Mail (optional)
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="user@example.com"
                  />
                </div>
                <button
                  onClick={createInvite}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {inviteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Link generieren
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Einladungslink (gültig für 7 Tage):
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-zinc-300 select-all"
                  />
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {copied ? "Kopiert!" : "Kopieren"}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setInviteLink("");
                    setInviteEmail("");
                  }}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Weiteren Link erstellen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE API KEY MODAL ── */}
      {createKeyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Neuen API-Key erstellen</h2>
              <button onClick={resetKeyModal} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!createdKeyValue ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="z.B. Mein Claude Agent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    User <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newKeyUserId}
                    onChange={(e) => setNewKeyUserId(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    <option value="">User auswählen...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Ablaufdatum (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <button
                  onClick={createApiKey}
                  disabled={creatingKey || !newKeyName || !newKeyUserId}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {creatingKey && <Loader2 className="w-4 h-4 animate-spin" />}
                  API-Key generieren
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                  <p className="text-sm text-amber-300 font-medium">
                    ⚠️ Nur jetzt sichtbar!
                  </p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    Dieser Key wird nicht gespeichert. Kopiere ihn jetzt und bewahre ihn sicher auf.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Dein API-Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={createdKeyValue}
                      className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-emerald-300 font-mono select-all"
                    />
                    <button
                      onClick={copyKey}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                    >
                      {keyCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {keyCopied ? "Kopiert!" : "Kopieren"}
                    </button>
                  </div>
                </div>

                <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3">
                  <p className="text-xs text-zinc-500 font-medium mb-1">Verwendung:</p>
                  <code className="text-xs text-zinc-400 font-mono break-all">
                    Authorization: Bearer {createdKeyValue}
                  </code>
                </div>

                <button
                  onClick={resetKeyModal}
                  className="w-full px-4 py-2 bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm rounded-md transition-colors"
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                {editingUser.username} bearbeiten
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rolle</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              {editRole === "user" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Projektzugang{" "}
                    {editAccess.length > 0 && `(${editAccess.length} ausgewählt)`}
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {projects.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2.5 px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-md cursor-pointer hover:border-emerald-500/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={editAccess.includes(p.id)}
                          onChange={() => toggleProject(p.id)}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-white">{p.name}</span>
                      </label>
                    ))}
                    {projects.length === 0 && (
                      <p className="text-xs text-zinc-500 text-center py-3">
                        Keine Projekte vorhanden
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">Leer = kein Projektzugang</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm rounded-md transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
