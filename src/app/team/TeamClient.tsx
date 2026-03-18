"use client";

import { useState } from "react";
import { Plus, Users, X, Bot, User, Zap } from "lucide-react";
import { AgentCard } from "@/components/team/AgentCard";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  description?: string | null;
  tools?: string | null;
  skills?: string | null;
  createdAt: Date;
  _count?: { tasks: number };
}

interface TeamClientProps {
  initialUsers: TeamUser[];
}

export function TeamClient({ initialUsers }: TeamClientProps) {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<TeamUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "human", avatar: "" });
  const [loading, setLoading] = useState(false);

  const humans = users.filter((u) => u.role !== "agent");
  const agents = users.filter((u) => u.role === "agent");

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", role: "human", avatar: "" });
    setShowModal(true);
  };

  const openEdit = (user: TeamUser) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, avatar: user.avatar ?? "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editUser) {
        const res = await fetch("/api/team", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editUser.id, ...form }),
        });
        if (res.ok) {
          const updated = await res.json();
          setUsers(users.map((u) => (u.id === editUser.id ? updated : u)));
        }
      } else {
        const res = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setUsers([...users, created]);
        }
      }
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Team-Mitglied wirklich entfernen?")) return;
    const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
    if (res.ok) setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <>
      {/* Mission Statement Banner */}
      <div className="mb-8 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Mission Statement</p>
            <p className="text-base font-semibold text-white leading-relaxed">
              Unsere Mission: Ein effizientes KI-Team zu sein, das 24/7 autonom für Tomek arbeitet und Wert generiert.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>{agents.length} KI-Agenten</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>{humans.length} {humans.length === 1 ? "Mensch" : "Menschen"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-zinc-300">Team-Mitglieder</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Neues Mitglied
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Team-Mitglieder</p>
        </div>
      ) : (
        <div className="space-y-8">
          {agents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                KI-Agenten
                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-full text-[10px] border border-purple-500/20">
                  {agents.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((user) => (
                  <AgentCard
                    key={user.id}
                    user={user}
                    onEdit={() => openEdit(user)}
                    onDelete={() => handleDelete(user.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {humans.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Menschen
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] border border-emerald-500/20">
                  {humans.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {humans.map((user) => (
                  <AgentCard
                    key={user.id}
                    user={user}
                    onEdit={() => openEdit(user)}
                    onDelete={() => handleDelete(user.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">
                {editUser ? "Mitglied bearbeiten" : "Neues Mitglied"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Name..."
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Rolle</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="human">Mensch</option>
                    <option value="agent">KI-Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Avatar (Emoji)</label>
                  <input
                    type="text"
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    placeholder="🤖"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
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
                  {loading ? "Speichern..." : editUser ? "Aktualisieren" : "Hinzufügen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
