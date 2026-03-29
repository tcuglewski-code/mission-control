"use client";

import { useState } from "react";
import { Users, Plus, Trash2, ChevronDown, Crown, Edit2, Eye, Shield } from "lucide-react";
import { getInitials } from "@/lib/utils";

type ProjectRole = "owner" | "editor" | "viewer";

interface ProjectUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
}

interface ProjectMemberItem {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  createdAt?: string;
  user: ProjectUser;
}

interface ProjectTeamSettingsProps {
  project: { id: string; name: string; color: string };
  initialMembers: ProjectMemberItem[];
  allUsers: ProjectUser[];
  canManage: boolean;
  currentUserId: string;
}

const ROLE_CONFIG: Record<ProjectRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  editor: { label: "Editor", icon: Edit2, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  viewer: { label: "Viewer", icon: Eye, color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as ProjectRole] ?? ROLE_CONFIG.viewer;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export function ProjectTeamSettings({
  project,
  initialMembers,
  allUsers,
  canManage,
  currentUserId,
}: ProjectTeamSettingsProps) {
  const [members, setMembers] = useState<ProjectMemberItem[]>(initialMembers);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("viewer");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // User-IDs die bereits Mitglieder sind
  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  async function handleAddMember() {
    if (!selectedUserId) return;
    setAdding(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
    });

    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Hinzufügen");
    } else {
      setMembers((prev) => [...prev, data]);
      setSelectedUserId("");
      setSuccess(`${data.user.name} wurde als ${ROLE_CONFIG[selectedRole].label} hinzugefügt.`);
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  async function handleRoleChange(userId: string, newRole: ProjectRole) {
    const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: updated.role } : m)));
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Mitglied aus diesem Projekt entfernen?")) return;

    const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    }
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">Team-Verwaltung</h2>
        <span className="text-xs text-zinc-600 ml-1">({members.length} Mitglieder)</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-600">
          <Shield className="w-3 h-3" />
          {canManage ? "Du kannst Mitglieder verwalten" : "Nur lesen"}
        </span>
      </div>

      {/* Rollen-Legende */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="text-zinc-600">Rollen:</span>
        {(["owner", "editor", "viewer"] as ProjectRole[]).map((r) => (
          <RoleBadge key={r} role={r} />
        ))}
      </div>

      {/* Mitglieder-Liste */}
      <div className="space-y-2">
        {members.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-6">Noch keine Mitglieder</p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[11px] font-bold text-zinc-300 shrink-0">
              {getInitials(m.user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{m.user.name}</p>
              <p className="text-[11px] text-zinc-600 truncate">{m.user.email}</p>
            </div>

            {/* Rolle ändern */}
            {canManage && m.userId !== currentUserId ? (
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.userId, e.target.value as ProjectRole)}
                className="text-xs bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-2 py-1 text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            ) : (
              <RoleBadge role={m.role} />
            )}

            {/* Entfernen */}
            {canManage && m.userId !== currentUserId && (
              <button
                onClick={() => handleRemoveMember(m.userId)}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Mitglied entfernen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {m.userId === currentUserId && (
              <span className="text-[10px] text-zinc-600 px-2">Du</span>
            )}
          </div>
        ))}
      </div>

      {/* Mitglied hinzufügen */}
      {canManage && (
        <div className="border-t border-[#2a2a2a] pt-5">
          <h3 className="text-xs font-semibold text-zinc-400 mb-3">Mitglied hinzufügen</h3>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 min-w-[180px] text-sm bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Person auswählen …</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              className="text-sm bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>

            <button
              onClick={handleAddMember}
              disabled={!selectedUserId || adding}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
              ✓ {success}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
