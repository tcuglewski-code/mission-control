"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus, Link2, RefreshCw, ShieldCheck, User, X, Check, Loader2 } from "lucide-react";

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

export function AdminUsersClient() {
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

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Benutzerverwaltung</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Benutzer, Rollen und Projektzugang verwalten</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setInviteModal(true); setInviteLink(""); setInviteEmail(""); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Einladung erstellen
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Benutzername</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Rolle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Projektzugang</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Erstellt</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#1e1e1e] hover:bg-[#1c1c1c] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{user.username}</p>
                        {user.email && <p className="text-xs text-zinc-500">{user.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                    }`}>
                      {user.role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Noch keine Benutzer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Einladungslink erstellen</h2>
              <button onClick={() => setInviteModal(false)} className="text-zinc-400 hover:text-white">
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
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? "Kopiert!" : "Kopieren"}
                  </button>
                </div>
                <button
                  onClick={() => { setInviteLink(""); setInviteEmail(""); }}
                  className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Weiteren Link erstellen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                {editingUser.username} bearbeiten
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-white">
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
                    Projektzugang {editAccess.length > 0 && `(${editAccess.length} ausgewählt)`}
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
                      <p className="text-xs text-zinc-500 text-center py-3">Keine Projekte vorhanden</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    Leer = kein Projektzugang
                  </p>
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
