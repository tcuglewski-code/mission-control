"use client";

import { useState, useEffect } from "react";
import { Plus, X, Bot, User, BarChart2, ChevronRight, CheckCircle2, Circle, Activity, Clock } from "lucide-react";
import Link from "next/link";

// ─── Typen ───────────────────────────────────────────────────────────────────

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  description?: string | null;
  tools?: string | null;
  skills?: string | null;
  weeklyCapacity?: number;
  createdAt: Date;
  _count?: { tasks: number };
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  project: { id: string; name: string; color: string } | null;
}

interface MemberProfile extends TeamUser {
  tasks: TaskItem[];
  openTasks: TaskItem[];
  doneTasks: TaskItem[];
  auslastung: number;
  logs: Array<{ id: string; action: string; entityName: string; createdAt: string }>;
}

interface UserTimeStat {
  weekMinutes: number;
  monthMinutes: number;
}

interface TeamClientProps {
  initialUsers: TeamUser[];
  userTimeStats?: Record<string, UserTimeStat>;
}

// ─── Statische Agent-Profile ─────────────────────────────────────────────────

const AGENT_PROFILES: Record<string, {
  emoji: string;
  title: string;
  description: string;
  skills: string[];
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  Amadeus: { emoji: "🎼", title: "Projekt-Orchestrator", description: "Koordiniert das Team, hält die Übersicht, delegiert.", skills: ["Orchestrierung", "Planung", "Delegation", "Systemarchitektur"], bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/25", textColor: "text-emerald-400" },
  Pixel:   { emoji: "🎨", title: "UX/UI Designer", description: "Gestaltet Design-System, App-UX und Brand-Identity.", skills: ["Figma", "Design-System", "Wireframes", "Brand"], bgColor: "bg-purple-500/15", borderColor: "border-purple-500/25", textColor: "text-purple-400" },
  Quill:   { emoji: "✍️", title: "Copywriter & SEO", description: "Erstellt Texte, Keywords und Meta-Content.", skills: ["Copywriting", "SEO", "Keywords", "Content"], bgColor: "bg-blue-500/15", borderColor: "border-blue-500/25", textColor: "text-blue-400" },
  Volt:    { emoji: "💻", title: "Frontend Developer", description: "Baut UI-Komponenten und interaktive Wizards.", skills: ["React", "Next.js", "TypeScript", "Tailwind"], bgColor: "bg-yellow-500/15", borderColor: "border-yellow-500/25", textColor: "text-yellow-400" },
  Bruno:   { emoji: "⚙️", title: "WP & Backend Developer", description: "Entwickelt Themes, Plugins, REST APIs.", skills: ["WordPress", "PHP", "REST API", "WooCommerce"], bgColor: "bg-orange-500/15", borderColor: "border-orange-500/25", textColor: "text-orange-400" },
  Argus:   { emoji: "🔒", title: "QA & Security", description: "Prüft Sicherheit, DSGVO-Konformität.", skills: ["Security", "DSGVO", "Testing", "Code-Review"], bgColor: "bg-red-500/15", borderColor: "border-red-500/25", textColor: "text-red-400" },
  Nomad:   { emoji: "📱", title: "Mobile App Developer", description: "Expo/React Native App — offline-first.", skills: ["React Native", "Expo", "Offline-First", "WatermelonDB"], bgColor: "bg-cyan-500/15", borderColor: "border-cyan-500/25", textColor: "text-cyan-400" },
  Archie:  { emoji: "🗄️", title: "Datenbank & API Architekt", description: "Entwirft Datenmodelle und API-Contracts.", skills: ["PostgreSQL", "API-Design", "Prisma", "Datenmodelle"], bgColor: "bg-slate-500/15", borderColor: "border-slate-500/25", textColor: "text-slate-400" },
  Sylvia:  { emoji: "🌲", title: "Förder-Intelligence", description: "Pflegt die Förderprogramm-Datenbank.", skills: ["Förderprogramme", "Matching", "Research", "Daten"], bgColor: "bg-green-500/15", borderColor: "border-green-500/25", textColor: "text-green-400" },
};

const SKILL_COLORS = [
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo:        { label: "Offen",       color: "text-blue-400" },
  in_progress: { label: "In Arbeit",   color: "text-yellow-400" },
  done:        { label: "Erledigt",    color: "text-emerald-400" },
  backlog:     { label: "Backlog",     color: "text-zinc-500" },
  cancelled:   { label: "Abgebrochen", color: "text-red-400" },
};

// ─── Auslastungs-Balken ───────────────────────────────────────────────────────

function AuslastungsBar({ value, className = "" }: { value: number; className?: string }) {
  const color = value >= 80 ? "bg-red-500" : value >= 60 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${value >= 80 ? "text-red-400" : value >= 60 ? "text-yellow-400" : "text-emerald-400"}`}>
        {value}%
      </span>
    </div>
  );
}

// ─── Mitglied-Karte ──────────────────────────────────────────────────────────

function MemberCard({ user, onEdit, onDelete, onClick }: {
  user: TeamUser;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const profile = AGENT_PROFILES[user.name];
  const isHuman = user.role !== "agent";
  const emoji = user.avatar || profile?.emoji || (isHuman ? "👤" : "🤖");
  const bgColor = profile?.bgColor ?? "bg-zinc-500/15";
  const borderColor = profile?.borderColor ?? "border-zinc-500/25";
  const textColor = profile?.textColor ?? "text-zinc-400";
  const totalTasks = user._count?.tasks ?? 0;
  const auslastung = totalTasks > 0 ? Math.min(Math.round((totalTasks / 15) * 100), 100) : 0;

  let skillList: string[] = [];
  try { if (user.skills) skillList = JSON.parse(user.skills); } catch {}
  const displaySkills = (profile?.skills ?? skillList).slice(0, 3);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#383838] transition-colors group relative cursor-pointer"
      onClick={onClick}>
      {/* Aktionen */}
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="absolute top-3 right-3 text-[10px] font-semibold text-zinc-600 hover:text-white transition-colors tracking-wide uppercase z-10">
        BEARBEITEN →
      </button>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center shrink-0 ${bgColor} border ${borderColor}`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-bold text-white text-sm">{user.name}</h3>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1 ${bgColor} ${textColor} border ${borderColor}`}>
              {isHuman ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
              {isHuman ? "Mensch" : "KI-Agent"}
            </span>
          </div>
          {profile?.title && <p className="text-xs text-zinc-400 mb-2">{profile.title}</p>}
          <AuslastungsBar value={auslastung} className="mb-2" />
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Circle className="w-3 h-3" />{totalTasks} Tasks</span>
          </div>
          {displaySkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {displaySkills.map((s, i) => (
                <span key={s} className={`px-2 py-0.5 text-[10px] rounded-md font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Löschen */}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute bottom-3 right-3 p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10">
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Profil-Pfeil */}
      <ChevronRight className="absolute bottom-3 left-3 w-3.5 h-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ─── Mitglied-Profil Modal ───────────────────────────────────────────────────

function MemberProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tasks" | "activity">("tasks");

  useEffect(() => {
    fetch(`/api/team/members?id=${userId}`)
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  const agentProfile = profile ? AGENT_PROFILES[profile.name] : null;
  const emoji = profile?.avatar || agentProfile?.emoji || (profile?.role !== "agent" ? "👤" : "🤖");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] sm:rounded-xl rounded-t-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up sm:animate-none"
        onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag-Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Lade Profil...</div>
        ) : !profile ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Fehler beim Laden</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-[#2a2a2a]">
              <div className={`w-14 h-14 text-3xl rounded-xl flex items-center justify-center shrink-0 ${agentProfile?.bgColor ?? "bg-zinc-700/30"} border ${agentProfile?.borderColor ?? "border-zinc-700/30"}`}>
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${agentProfile?.bgColor ?? "bg-zinc-700/30"} ${agentProfile?.textColor ?? "text-zinc-400"} border ${agentProfile?.borderColor ?? "border-zinc-600/30"}`}>
                    {profile.role === "agent" ? "KI-Agent" : "Mensch"}
                  </span>
                </div>
                {agentProfile?.title && <p className="text-sm text-zinc-400 mb-2">{agentProfile.title}</p>}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-[#252525] rounded-lg p-2">
                    <div className="text-xl font-bold text-white">{profile.tasks.length}</div>
                    <div className="text-[10px] text-zinc-500">Gesamt</div>
                  </div>
                  <div className="bg-[#252525] rounded-lg p-2">
                    <div className="text-xl font-bold text-yellow-400">{profile.openTasks.length}</div>
                    <div className="text-[10px] text-zinc-500">Offen</div>
                  </div>
                  <div className="bg-[#252525] rounded-lg p-2">
                    <div className="text-xl font-bold text-emerald-400">{profile.doneTasks.length}</div>
                    <div className="text-[10px] text-zinc-500">Erledigt</div>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auslastung */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">Auslastung</span>
                <span className="text-xs font-semibold text-zinc-300">{profile.auslastung}%</span>
              </div>
              <AuslastungsBar value={profile.auslastung} />
              {profile.auslastung >= 80 && (
                <p className="text-xs text-red-400 mt-1">⚠ Überlastung — Kapazität prüfen</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-[#2a2a2a]">
              {(["tasks", "activity"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${tab === t ? "text-white border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {t === "tasks" ? "Zugewiesene Tasks" : "Letzte Aktivität"}
                </button>
              ))}
            </div>

            {/* Inhalt */}
            <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
              {tab === "tasks" ? (
                <div className="p-4 space-y-1">
                  {profile.tasks.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-6">Keine Tasks zugewiesen</p>
                  ) : (
                    profile.tasks.slice(0, 20).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">
                        {task.status === "done"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          : <Circle className="w-4 h-4 text-zinc-600 shrink-0" />}
                        <span className={`text-xs flex-1 truncate ${task.status === "done" ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                          {task.title}
                        </span>
                        {task.project && (
                          <span className="text-[10px] text-zinc-600 shrink-0">{task.project.name}</span>
                        )}
                        <span className={`text-[10px] shrink-0 ${STATUS_CONFIG[task.status]?.color ?? "text-zinc-500"}`}>
                          {STATUS_CONFIG[task.status]?.label ?? task.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {profile.logs.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-6">Keine Aktivität</p>
                  ) : (
                    profile.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#252525]">
                        <Activity className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-zinc-300">{log.action} — {log.entityName}</span>
                          <div className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ────────────────────────────────────────────────────────

export function TeamClient({ initialUsers, userTimeStats = {} }: TeamClientProps) {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<TeamUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "human", avatar: "", weeklyCapacity: 40 });
  const [loading, setLoading] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const agents = users.filter((u) => u.role === "agent");
  const humans = users.filter((u) => u.role !== "agent");
  const leadAgent = agents.find((u) => u.name === "Amadeus") ?? agents[0];
  const otherAgents = agents.filter((u) => u.id !== leadAgent?.id);

  // Team-Kapazität berechnen
  const totalCapacity = users.reduce((sum, u) => sum + (u.weeklyCapacity ?? 40), 0);
  const totalTasks = users.reduce((sum, u) => sum + (u._count?.tasks ?? 0), 0);
  const teamAuslastung = totalCapacity > 0 ? Math.min(Math.round((totalTasks / (totalCapacity / 2)) * 100), 100) : 0;

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", role: "human", avatar: "", weeklyCapacity: 40 });
    setShowModal(true);
  };

  const openEdit = (user: TeamUser) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, avatar: user.avatar ?? "", weeklyCapacity: user.weeklyCapacity ?? 40 });
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
    <div className="p-6 max-w-6xl mx-auto">

      {/* ─── Team-Kapazität Übersicht ─── */}
      <div className="mb-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Team-Kapazität</h2>
          </div>
          <Link href="/team/resources"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            Ressourcenplanung <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#252525] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Mitglieder</div>
          </div>
          <div className="bg-[#252525] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalCapacity}h</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Gesamtkapazität/Woche</div>
          </div>
          <div className="bg-[#252525] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalTasks}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Offene Tasks</div>
          </div>
          <div className="bg-[#252525] rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${teamAuslastung >= 80 ? "text-red-400" : teamAuslastung >= 60 ? "text-yellow-400" : "text-emerald-400"}`}>
              {teamAuslastung}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Auslastung</div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-zinc-500">Teamauslastung gesamt</span>
            <span className="text-[10px] text-zinc-400">{totalTasks} Tasks / {Math.round(totalCapacity / 2)} max. Tasks</span>
          </div>
          <AuslastungsBar value={teamAuslastung} />
          {teamAuslastung >= 80 && (
            <p className="text-xs text-red-400 mt-2">⚠ Team ist überlastet — Ressourcen neu verteilen</p>
          )}
        </div>
      </div>

      {/* ─── Team Zeiterfassung ─── */}
      {Object.keys(userTimeStats).length > 0 && (
        <div className="mb-8 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Team-Zeiterfassung</h2>
            <span className="text-[10px] text-zinc-600 ml-2">Diese Woche / Dieser Monat</span>
          </div>
          <div className="space-y-3">
            {users
              .filter((u) => userTimeStats[u.id])
              .sort((a, b) => (userTimeStats[b.id]?.weekMinutes ?? 0) - (userTimeStats[a.id]?.weekMinutes ?? 0))
              .map((u) => {
                const stats = userTimeStats[u.id];
                const weekHours = Math.round((stats.weekMinutes / 60) * 10) / 10;
                const monthHours = Math.round((stats.monthMinutes / 60) * 10) / 10;
                const capacity = u.weeklyCapacity ?? 40;
                const weekPercent = Math.min(Math.round((weekHours / capacity) * 100), 120);
                const isOvertime = weekHours > capacity;

                return (
                  <div key={u.id} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                      {u.avatar || u.name[0]}
                    </div>
                    <div className="w-28 shrink-0">
                      <p className="text-xs text-white truncate">{u.name}</p>
                      <p className="text-[9px] text-zinc-600">{u.role === "agent" ? "KI-Agent" : "Mensch"}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium ${isOvertime ? "text-red-400" : "text-zinc-400"}`}>
                          {weekHours}h Woche
                          {isOvertime && <span className="ml-1 text-[9px]">⚠ +{Math.round((weekHours - capacity) * 10) / 10}h Überstunden</span>}
                        </span>
                        <span className="text-[10px] text-zinc-600">{monthHours}h Monat</span>
                      </div>
                      <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            weekPercent > 100 ? "bg-red-500" : weekPercent > 80 ? "bg-yellow-500" : "bg-purple-500"
                          }`}
                          style={{ width: `${Math.min(weekPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-mono tabular-nums w-10 text-right ${
                      weekPercent > 100 ? "text-red-400" : weekPercent > 80 ? "text-yellow-400" : "text-zinc-400"
                    }`}>
                      {weekPercent}%
                    </span>
                  </div>
                );
              })}
            {users.filter((u) => userTimeStats[u.id]).length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-4">Keine Zeitdaten für diesen Zeitraum</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Mission Banner ─── */}
      <div className="mb-8 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 px-8 py-5 text-center">
        <p className="text-base text-zinc-200 italic leading-relaxed font-medium">
          &ldquo;Unsere Mission: Ein effizientes KI-Team zu sein, das 24/7 autonom für Tomek arbeitet und Wert generiert.&rdquo;
        </p>
      </div>

      {/* ─── Lead Agent ─── */}
      {leadAgent && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Leitung</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="bg-[#1a1a1a] border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/30 transition-colors cursor-pointer group"
            onClick={() => setProfileUserId(leadAgent.id)}>
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 text-3xl rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/25">
                {leadAgent.avatar || AGENT_PROFILES["Amadeus"]?.emoji || "🎼"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white">{leadAgent.name}</h3>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-sm text-zinc-400 mb-3">{AGENT_PROFILES["Amadeus"]?.title}</p>
                <AuslastungsBar value={Math.min(Math.round(((leadAgent._count?.tasks ?? 0) / 15) * 100), 100)} className="max-w-xs mb-3" />
                <p className="text-zinc-500 text-sm max-w-2xl">{AGENT_PROFILES["Amadeus"]?.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {AGENT_PROFILES["Amadeus"]?.skills.map((s, i) => (
                    <span key={s} className={`px-2.5 py-1 text-xs rounded-lg font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KI-Agenten ─── */}
      {otherAgents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">KI-Agenten</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
            <span className="text-[10px] text-zinc-600">{otherAgents.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {otherAgents.map((user) => (
              <MemberCard key={user.id} user={user}
                onEdit={() => openEdit(user)}
                onDelete={() => handleDelete(user.id)}
                onClick={() => setProfileUserId(user.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Menschen ─── */}
      {humans.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Menschen</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {humans.map((user) => (
              <MemberCard key={user.id} user={user}
                onEdit={() => openEdit(user)}
                onDelete={() => handleDelete(user.id)}
                onClick={() => setProfileUserId(user.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Hinzufügen ─── */}
      <div className="mt-8 flex justify-center">
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Neues Mitglied hinzufügen
        </button>
      </div>

      {/* ─── Profil Modal ─── */}
      {profileUserId && (
        <MemberProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}

      {/* ─── Erstellen/Bearbeiten Modal ─── */}
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
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Name..." required
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Email *</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com" required
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Rolle</label>
                  <select value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="human">Mensch</option>
                    <option value="agent">KI-Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Avatar (Emoji)</label>
                  <input type="text" value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    placeholder="🤖"
                    className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Wochenkapazität (Stunden)</label>
                <input type="number" min={1} max={168} value={form.weeklyCapacity}
                  onChange={(e) => setForm({ ...form, weeklyCapacity: parseInt(e.target.value) || 40 })}
                  className="w-full bg-[#252525] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                <p className="text-[10px] text-zinc-600 mt-1">Standard: 40h/Woche · 1 Story Point = 2 Stunden</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors">
                  Abbrechen
                </button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors font-medium">
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
