"use client";

import { useState } from "react";
import { Plus, X, Bot, User } from "lucide-react";

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

// Static agent data for hero layout
const AGENT_PROFILES: Record<string, {
  emoji: string;
  title: string;
  description: string;
  skills: string[];
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  "Amadeus": {
    emoji: "🎼",
    title: "Projekt-Orchestrator & Chief of Staff",
    description: "Koordiniert das Team, hält die Übersicht, delegiert. Der erste Ansprechpartner zwischen Tomek und dem KI-Team.",
    skills: ["Orchestrierung", "Planung", "Delegation", "Systemarchitektur"],
    color: "emerald",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/25",
    textColor: "text-emerald-400",
  },
  "Pixel": {
    emoji: "🎨",
    title: "UX/UI Designer",
    description: "Gestaltet das Design-System, App-UX und Brand-Identity. Sorgt für konsistente, schöne Interfaces.",
    skills: ["Figma", "Design-System", "Wireframes", "Brand"],
    color: "purple",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/25",
    textColor: "text-purple-400",
  },
  "Quill": {
    emoji: "✍️",
    title: "Copywriter & SEO-Stratege",
    description: "Erstellt überzeugende Texte, Keywords und Meta-Content. Optimiert die Sichtbarkeit in Suchmaschinen.",
    skills: ["Copywriting", "SEO", "Keywords", "Content"],
    color: "blue",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/25",
    textColor: "text-blue-400",
  },
  "Volt": {
    emoji: "💻",
    title: "Frontend Developer",
    description: "Baut UI-Komponenten, interaktive Wizards und das Kundenportal-Frontend.",
    skills: ["React", "Next.js", "TypeScript", "TailwindCSS"],
    color: "yellow",
    bgColor: "bg-yellow-500/15",
    borderColor: "border-yellow-500/25",
    textColor: "text-yellow-400",
  },
  "Bruno": {
    emoji: "⚙️",
    title: "WP & Backend Developer",
    description: "Entwickelt Themes, Plugins, REST APIs und WooCommerce-Integrationen.",
    skills: ["WordPress", "PHP", "REST API", "WooCommerce"],
    color: "orange",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/25",
    textColor: "text-orange-400",
  },
  "Argus": {
    emoji: "🔒",
    title: "QA & Security Analyst",
    description: "Prüft Sicherheit, DSGVO-Konformität und führt systematische Tests durch.",
    skills: ["Security", "DSGVO", "Testing", "Code-Review"],
    color: "red",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/25",
    textColor: "text-red-400",
  },
  "Nomad": {
    emoji: "📱",
    title: "Mobile App Developer",
    description: "Entwickelt die Expo/React Native App für Außeneinsätze — offline-first, robust, schnell.",
    skills: ["React Native", "Expo", "Offline-First", "WatermelonDB"],
    color: "cyan",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-500/25",
    textColor: "text-cyan-400",
  },
  "Archie": {
    emoji: "🗄️",
    title: "Datenbank & API Architekt",
    description: "Entwirft Datenmodelle, API-Contracts und Datenflüsse zwischen allen Systemen.",
    skills: ["PostgreSQL", "API-Design", "Prisma", "Datenmodelle"],
    color: "slate",
    bgColor: "bg-slate-500/15",
    borderColor: "border-slate-500/25",
    textColor: "text-slate-400",
  },
  "Sylvia": {
    emoji: "🌲",
    title: "Förder-Intelligence",
    description: "Pflegt die Förderprogramm-Datenbank und optimiert das Matching für Waldbesitzer.",
    skills: ["Förderprogramme", "Matching", "Research", "Daten"],
    color: "green",
    bgColor: "bg-green-500/15",
    borderColor: "border-green-500/25",
    textColor: "text-green-400",
  },
};

const SKILL_BADGE_COLORS = [
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
];

function getSkillColor(index: number) {
  return SKILL_BADGE_COLORS[index % SKILL_BADGE_COLORS.length];
}

function getProfile(user: TeamUser) {
  return AGENT_PROFILES[user.name] ?? null;
}

interface AgentHeroCardProps {
  user: TeamUser;
  lead?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function AgentHeroCard({ user, lead, onEdit, onDelete }: AgentHeroCardProps) {
  const profile = getProfile(user);
  const isHuman = user.role !== "agent";

  let skillList: string[] = [];
  try {
    if (user.skills) skillList = JSON.parse(user.skills);
  } catch {}

  const displaySkills = profile?.skills ?? skillList;
  const emoji = user.avatar || profile?.emoji || (isHuman ? "👤" : "🤖");
  const bgColor = profile?.bgColor ?? (isHuman ? "bg-zinc-500/15" : "bg-zinc-500/15");
  const borderColor = profile?.borderColor ?? (isHuman ? "border-zinc-500/25" : "border-zinc-500/25");
  const textColor = profile?.textColor ?? (isHuman ? "text-zinc-400" : "text-zinc-400");
  const title = profile?.title ?? user.description ?? "";
  const description = profile?.description ?? "";

  return (
    <div
      className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#333] transition-colors group relative ${
        lead ? "col-span-full" : ""
      }`}
    >
      {/* ROLE CARD link */}
      <button
        onClick={onEdit}
        className="absolute top-4 right-4 text-[10px] font-semibold text-zinc-600 hover:text-white transition-colors tracking-wide uppercase"
      >
        ROLE CARD →
      </button>

      <div className={`flex ${lead ? "items-start gap-6" : "flex-col gap-4"}`}>
        {/* Icon */}
        <div
          className={`${lead ? "w-16 h-16 text-3xl" : "w-12 h-12 text-2xl"} rounded-xl flex items-center justify-center shrink-0 ${bgColor} border ${borderColor}`}
        >
          {emoji}
        </div>

        <div className="flex-1 min-w-0 pr-16">
          {/* Name + badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={`font-bold text-white ${lead ? "text-xl" : "text-base"}`}>
              {user.name}
            </h3>
            {isHuman && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                Mensch
              </span>
            )}
            {!isHuman && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1 ${bgColor} ${textColor} border ${borderColor}`}>
                <Bot className="w-2.5 h-2.5" />
                KI-Agent
              </span>
            )}
          </div>

          {/* Title */}
          {title && (
            <p className={`${lead ? "text-base" : "text-sm"} text-zinc-400 font-medium mb-2`}>
              {title}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className={`text-zinc-500 text-sm leading-relaxed mb-4 ${lead ? "max-w-2xl" : ""}`}>
              {description}
            </p>
          )}

          {/* Skills */}
          {displaySkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.map((skill, i) => (
                <span
                  key={skill}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium ${getSkillColor(i)}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete button (hidden, on hover) */}
      <button
        onClick={onDelete}
        className="absolute bottom-4 right-4 p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="Mitglied entfernen"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function TeamClient({ initialUsers }: TeamClientProps) {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<TeamUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "human", avatar: "" });
  const [loading, setLoading] = useState(false);

  const agents = users.filter((u) => u.role === "agent");
  const humans = users.filter((u) => u.role !== "agent");

  // Lead agent = Amadeus, or first agent
  const leadAgent = agents.find((u) => u.name === "Amadeus") ?? agents[0];
  const otherAgents = agents.filter((u) => u.id !== leadAgent?.id);

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
    <div className="p-6 max-w-5xl mx-auto">
      {/* ─── SECTION 1: Mission Banner ─── */}
      <div className="mb-10 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 px-8 py-6 text-center">
        <p className="text-lg text-zinc-200 italic leading-relaxed font-medium">
          &ldquo;Unsere Mission: Ein effizientes KI-Team zu sein, das 24/7 autonom für Tomek arbeitet und Wert generiert.&rdquo;
        </p>
      </div>

      {/* ─── SECTION 2: Hero Heading ─── */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Meet the Team</h1>
        <p className="text-zinc-400 text-lg mb-3">
          {agents.length} KI-Agenten + {humans.length === 1 ? "Tomek" : `${humans.length} Menschen`} — jeder mit echter Rolle und echter Persönlichkeit.
        </p>
        <p className="text-zinc-500 text-sm max-w-2xl mx-auto leading-relaxed">
          Wir wollten sehen was passiert wenn KI nicht nur Fragen beantwortet — sondern eigenständig ein Unternehmen führt:
          Märkte analysiert, Inhalte erstellt, Projekte umsetzt. Rund um die Uhr.
        </p>
      </div>

      {/* ─── SECTION 3: Lead Agent ─── */}
      {leadAgent && (
        <div className="mb-6">
          <AgentHeroCard
            user={leadAgent}
            lead
            onEdit={() => openEdit(leadAgent)}
            onDelete={() => handleDelete(leadAgent.id)}
          />
        </div>
      )}

      {/* ─── SECTION 4: Other Agents Grid ─── */}
      {otherAgents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">KI-Agenten</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
            <span className="text-[10px] text-zinc-600">{otherAgents.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {otherAgents.map((user) => (
              <AgentHeroCard
                key={user.id}
                user={user}
                onEdit={() => openEdit(user)}
                onDelete={() => handleDelete(user.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Humans Section ─── */}
      {humans.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Menschen</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {humans.map((user) => (
              <AgentHeroCard
                key={user.id}
                user={user}
                onEdit={() => openEdit(user)}
                onDelete={() => handleDelete(user.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Add Member button ─── */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Mitglied hinzufügen
        </button>
      </div>

      {/* ─── Modal ─── */}
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
    </div>
  );
}
