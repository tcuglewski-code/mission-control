"use client";

import { useState } from "react";
import {
  Building2,
  Server,
  FileText,
  Euro,
  ExternalLink,
  X,
  ChevronRight,
  Users,
  TrendingUp,
} from "lucide-react";

interface TenantSystem {
  id: string;
  name: string;
  type: string;
  url: string | null;
  status: string;
  notes: string | null;
}

interface TenantContract {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  monthlyRate: number;
  setupFee: number;
  billingCycle: string;
  notes: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  systems: TenantSystem[];
  contracts: TenantContract[];
}

interface Props {
  tenants: Tenant[];
  totalMRR: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  staging: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  churned: "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  maintenance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  down: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colors}`}>
      {status}
    </span>
  );
}

export function TenantsClient({ tenants, totalMRR }: Props) {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const avgMRR = activeTenants > 0 ? totalMRR / activeTenants : 0;

  const handleSaveNotes = async () => {
    if (!selectedTenant) return;
    try {
      await fetch(`/api/tenants/${selectedTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSelectedTenant({ ...selectedTenant, notes });
      setEditingNotes(false);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={<Building2 className="w-5 h-5 text-blue-400" />}
          label="Gesamt-Kunden"
          value={tenants.length.toString()}
        />
        <KPICard
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          label="Aktive Kunden"
          value={activeTenants.toString()}
        />
        <KPICard
          icon={<Euro className="w-5 h-5 text-amber-400" />}
          label="MRR Gesamt"
          value={`€${totalMRR.toLocaleString("de-DE")}`}
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          label="Ø MRR / Kunde"
          value={`€${avgMRR.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}
        />
      </div>

      {/* Tenant List */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-zinc-300">Alle Tenants</h2>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {tenants.length === 0 ? (
            <div className="px-5 py-12 text-center text-zinc-500">
              Noch keine Tenants angelegt.
            </div>
          ) : (
            tenants.map((tenant) => {
              const mrr = tenant.contracts.reduce(
                (s, c) => s + c.monthlyRate,
                0
              );
              return (
                <button
                  key={tenant.id}
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setNotes(tenant.notes || "");
                    setEditingNotes(false);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#252525] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">
                        {tenant.name}
                      </span>
                      <StatusBadge status={tenant.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {tenant.industry && (
                        <span className="text-xs text-zinc-500">
                          {tenant.industry}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {tenant.systems.length} Systeme
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {tenant.systems.map((sys) => (
                        <StatusBadge key={sys.id} status={sys.status} />
                      ))}
                    </div>
                    <span className="text-sm font-mono text-zinc-300 w-20 text-right">
                      €{mrr}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {selectedTenant.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedTenant.status} />
                  {selectedTenant.industry && (
                    <span className="text-xs text-zinc-500">
                      {selectedTenant.industry}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1 rounded-md hover:bg-[#2a2a2a] text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Kontakt */}
              {(selectedTenant.contactName ||
                selectedTenant.contactEmail ||
                selectedTenant.contactPhone) && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Kontakt
                  </h3>
                  <div className="text-sm text-zinc-300 space-y-1">
                    {selectedTenant.contactName && (
                      <p>{selectedTenant.contactName}</p>
                    )}
                    {selectedTenant.contactEmail && (
                      <p className="text-zinc-400">
                        {selectedTenant.contactEmail}
                      </p>
                    )}
                    {selectedTenant.contactPhone && (
                      <p className="text-zinc-400">
                        {selectedTenant.contactPhone}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Systeme */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5" />
                  Systeme
                </h3>
                <div className="space-y-2">
                  {selectedTenant.systems.map((sys) => (
                    <div
                      key={sys.id}
                      className="flex items-center justify-between bg-[#252525] rounded-lg px-4 py-2"
                    >
                      <div>
                        <span className="text-sm text-zinc-200">
                          {sys.name}
                        </span>
                        <span className="text-xs text-zinc-500 ml-2">
                          ({sys.type})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sys.status} />
                        {sys.url && (
                          <a
                            href={sys.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-200"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Verträge */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Verträge
                </h3>
                <div className="space-y-2">
                  {selectedTenant.contracts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-[#252525] rounded-lg px-4 py-2"
                    >
                      <div>
                        <span className="text-sm text-zinc-200 capitalize">
                          {c.type}
                        </span>
                        <span className="text-xs text-zinc-500 ml-2">
                          ab{" "}
                          {new Date(c.startDate).toLocaleDateString("de-DE")}
                          {c.endDate &&
                            ` bis ${new Date(c.endDate).toLocaleDateString("de-DE")}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={c.status} />
                        <span className="text-sm font-mono text-emerald-400">
                          €{c.monthlyRate}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Notizen
                </h3>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-zinc-500"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setNotes(selectedTenant.notes || "");
                        }}
                        className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="w-full text-left text-sm text-zinc-400 bg-[#252525] rounded-lg px-3 py-2 hover:bg-[#2a2a2a] transition-colors min-h-[60px]"
                  >
                    {selectedTenant.notes || "Klicken zum Bearbeiten..."}
                  </button>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
