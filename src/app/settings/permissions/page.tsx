import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession } from "@/lib/server-auth";
import { ROLE_PERMISSIONS, PERMISSION_GROUPS, MC_ROLES } from "@/lib/permissions";
import { Shield, Check, X, Info } from "lucide-react";

export default async function PermissionsPage() {
  await requireServerSession();

  return (
    <AppShell title="Berechtigungs-Matrix" subtitle="Übersicht aller Rollen und Rechte">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Berechtigungs-Matrix</h1>
            <p className="text-xs text-zinc-500">Welche Rolle hat welche Rechte im System</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-900 border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Read-only Übersicht
          </div>
        </div>

        {/* Rollen-Beschreibungen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MC_ROLES.map((r) => (
            <div key={r.value} className={`p-4 rounded-xl border ${r.bg}`}>
              <p className={`text-sm font-semibold ${r.color}`}>{r.label}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {r.value === "admin" && "Vollzugriff auf alles"}
                {r.value === "projektmanager" && "Projekte & Tasks verwalten"}
                {r.value === "entwickler" && "Tasks bearbeiten, Zeit erfassen"}
                {r.value === "beobachter" && "Nur lesen, keine Änderungen"}
              </p>
            </div>
          ))}
        </div>

        {/* Berechtigungs-Tabelle */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Tabellen-Header */}
          <div className="grid grid-cols-[1fr_repeat(4,_auto)] gap-0 border-b border-[#2a2a2a]">
            <div className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Berechtigung
            </div>
            {MC_ROLES.map((r) => (
              <div
                key={r.value}
                className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28"
              >
                <span className={r.color}>{r.label}</span>
              </div>
            ))}
          </div>

          {/* Gruppen */}
          {PERMISSION_GROUPS.map((group, gi) => (
            <div key={gi}>
              {/* Gruppen-Header */}
              <div className="px-5 py-2.5 bg-[#161616] border-b border-[#222]">
                <span className="text-xs font-semibold text-zinc-400">{group.label}</span>
              </div>

              {/* Berechtigungen */}
              {group.permissions.map((perm, pi) => {
                const isLast =
                  gi === PERMISSION_GROUPS.length - 1 &&
                  pi === group.permissions.length - 1;

                return (
                  <div
                    key={perm.key}
                    className={`grid grid-cols-[1fr_repeat(4,_auto)] gap-0 hover:bg-[#1a1a1a] transition-colors ${
                      !isLast ? "border-b border-[#222]" : ""
                    }`}
                  >
                    <div className="px-5 py-3 text-sm text-zinc-300">
                      {perm.label}
                      <span className="ml-2 text-[10px] text-zinc-600 font-mono">{perm.key}</span>
                    </div>
                    {MC_ROLES.map((r) => {
                      const rolePerms = ROLE_PERMISSIONS[r.value];
                      const has = rolePerms.includes(perm.key as any);
                      return (
                        <div key={r.value} className="flex items-center justify-center w-28 py-3">
                          {has ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700">
                              <X className="w-3 h-3 text-zinc-600" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Projekt-Rollen Info */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            Projekt-spezifische Rollen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                role: "Owner",
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
                perms: ["Mitglieder hinzufügen/entfernen", "Rollen ändern", "Projekt bearbeiten", "Alles was Editor darf"],
              },
              {
                role: "Editor",
                color: "text-blue-400",
                bg: "bg-blue-500/10 border-blue-500/20",
                perms: ["Tasks erstellen & bearbeiten", "Kommentare schreiben", "Dokumente erstellen", "Milestones verwalten"],
              },
              {
                role: "Viewer",
                color: "text-zinc-400",
                bg: "bg-zinc-500/10 border-zinc-500/20",
                perms: ["Projekte ansehen", "Tasks lesen", "Dokumente lesen", "Keine Änderungen"],
              },
            ].map((r) => (
              <div key={r.role} className={`p-4 rounded-lg border ${r.bg}`}>
                <p className={`text-sm font-semibold ${r.color} mb-2`}>{r.role}</p>
                <ul className="space-y-1">
                  {r.perms.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-zinc-600">
            * Admins haben immer vollen Zugriff, unabhängig von der Projekt-Rolle.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
