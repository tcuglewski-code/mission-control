"use client";

import { useState } from "react";
import { Plus, Users, X, Bot, User } from "lucide-react";
import { AgentCard } from "@/components/team/AgentCard";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
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
  const [form, setForm] = useState({ name: "", email: "", role: "human" });
  const [loading, setLoading] = useState(false);

  const humans = users.filter((u) => u.role !== "agent");
  const agents = users.filter((u) => u.role === "agent");

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", role: "human" });
    setShowModal(true);
  };

  const openEdit = (user: TeamUser) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role });
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>{humans.length} Humans</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>{agents.length} Agents</span>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Mitglied hinzufügen
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-10 h-10 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Keine Team-Mitglieder</p>
        </div>
      ) : (
        <div className="space-y-6">
          {agents.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                AI Agents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((user) => (
                  <AgentCard key={user.id} user={user} onEdit={() => openEdit(user)} onDelete={() => handleDelete(user.id)} />
                ))}
              </div>
            </div>
          )}
          {humans.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Humans
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {humans.map((user) => (
                  <AgentCard key={user.id} user={user} onEdit={() => openEdit(user)} onDelete={() => handleDelete(user.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white">{editUser ? "Mitglied bearbeiten" : "Mitglied hinzufügen"}</h2>
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
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Rolle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="human">Human</option>
                  <option value="agent">AI Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors">
                  Abbrechen
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
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
