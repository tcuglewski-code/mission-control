"use client";

import { useState } from "react";
import { Mail, Plus, Copy, Check, Clock, Trash2, UserPlus } from "lucide-react";
import { format, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { MC_ROLES } from "@/lib/permissions";

interface InviteItem {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
  link: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-amber-400" },
  projektmanager: { label: "Projektmanager", color: "text-blue-400" },
  entwickler: { label: "Entwickler", color: "text-emerald-400" },
  beobachter: { label: "Beobachter", color: "text-zinc-400" },
};

export function AdminInvitesClient({ initialInvites }: { initialInvites: InviteItem[] }) {
  const [invites, setInvites] = useState<InviteItem[]>(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("entwickler");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Erstellen der Einladung");
    } else {
      setInvites((prev) => [data, ...prev]);
      setEmail("");
    }
  }

  async function copyLink(invite: InviteItem) {
    await navigator.clipboard.writeText(invite.link);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const pendingInvites = invites.filter((i) => !i.used && !isPast(new Date(i.expiresAt)));
  const usedInvites = invites.filter((i) => i.used || isPast(new Date(i.expiresAt)));

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Neue Einladung */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Neuen Benutzer einladen</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@beispiel.de"
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {MC_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {loading ? "Erstelle Einladung…" : "Einladung erstellen"}
            </button>
            <span className="text-xs text-zinc-600">
              <Clock className="inline w-3 h-3 mr-1" />
              48 Stunden gültig
            </span>
          </div>
        </form>
      </div>

      {/* Ausstehende Einladungen */}
      {pendingInvites.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <Mail className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">
              Ausstehende Einladungen ({pendingInvites.length})
            </h3>
          </div>
          <div className="divide-y divide-[#222]">
            {pendingInvites.map((invite) => {
              const roleInfo = ROLE_LABELS[invite.role] ?? ROLE_LABELS.entwickler;
              return (
                <div key={invite.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] ${roleInfo.color}`}>{roleInfo.label}</span>
                      <span className="text-[11px] text-zinc-600">
                        Läuft ab:{" "}
                        {format(new Date(invite.expiresAt), "d. MMM, HH:mm", { locale: de })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyLink(invite)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#161616] border border-[#2a2a2a] hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors"
                  >
                    {copiedId === invite.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Link kopieren
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verwendete / abgelaufene Einladungen */}
      {usedInvites.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden opacity-60">
          <div className="px-5 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-zinc-500">
              Verbraucht / Abgelaufen ({usedInvites.length})
            </h3>
          </div>
          <div className="divide-y divide-[#222]">
            {usedInvites.map((invite) => (
              <div key={invite.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-500 truncate">{invite.email}</p>
                  <p className="text-[11px] text-zinc-700">
                    {invite.used
                      ? "✓ Verwendet"
                      : `Abgelaufen: ${format(new Date(invite.expiresAt), "d. MMM", { locale: de })}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Einladungen erstellt</p>
        </div>
      )}
    </div>
  );
}
