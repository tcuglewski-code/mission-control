"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  X,
  Building2,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface ClientCount {
  projects: number;
  quotes: number;
  invoices: number;
}

interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  _count: ClientCount;
}

interface ClientForm {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: ClientForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

// ─── Kunden-Modal ─────────────────────────────────────────────────────────────
function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client?: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClientForm>(
    client
      ? {
          name: client.name,
          contactPerson: client.contactPerson ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name ist erforderlich"); return; }
    setSaving(true);
    setError("");
    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler beim Speichern");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] sm:rounded-xl w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#1c1c1c] z-10">
          <h2 className="text-sm font-semibold text-white">
            {client ? "Kunde bearbeiten" : "Neuer Kunde"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-[#252525] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Firmenname / Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mustermann GmbH"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Ansprechpartner</label>
            <input
              type="text"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Max Mustermann"
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">E-Mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@firma.de"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+49 123 4567890"
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Adresse</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Musterstraße 1&#10;12345 Musterstadt"
              rows={2}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notizen</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Interne Notizen zum Kunden..."
              rows={3}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#333] text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {client ? "Speichern" : "Anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Haupt-Seite ──────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy, sortDir });
      if (search) params.set("search", search);
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) setClients(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Kunde "${name}" wirklich löschen?`)) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    load();
  };

  const toggleSort = (field: "name" | "createdAt") => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: "name" | "createdAt" }) => {
    if (sortBy !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-emerald-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-emerald-400" />
    );
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Kunden</h1>
              <p className="text-xs text-zinc-500">{clients.length} Kunden gesamt</p>
            </div>
          </div>
          <button
            onClick={() => { setEditClient(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Kunde
          </button>
        </div>

        {/* Suche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name, Ansprechpartner oder E-Mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Tabelle */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Kopfzeile */}
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#2a2a2a] text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            <button
              onClick={() => toggleSort("name")}
              className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left"
            >
              Name <SortIcon field="name" />
            </button>
            <span>Ansprechpartner</span>
            <span>Kontakt</span>
            <span>Projekte</span>
            <button
              onClick={() => toggleSort("createdAt")}
              className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left"
            >
              Erstellt <SortIcon field="createdAt" />
            </button>
            <span />
          </div>

          {/* Inhalt */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-600">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                {search ? "Keine Kunden gefunden" : "Noch keine Kunden angelegt"}
              </p>
              {!search && (
                <button
                  onClick={() => { setEditClient(null); setModalOpen(true); }}
                  className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Ersten Kunden anlegen →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-[#1e1e1e] transition-colors group"
                >
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-medium text-white hover:text-emerald-400 transition-colors truncate"
                  >
                    {c.name}
                  </Link>

                  <span className="text-sm text-zinc-400 truncate">
                    {c.contactPerson ?? <span className="text-zinc-600">–</span>}
                  </span>

                  <div className="space-y-0.5">
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Mail className="w-3 h-3 shrink-0 text-zinc-600" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Phone className="w-3 h-3 shrink-0 text-zinc-600" />
                        <span className="truncate">{c.phone}</span>
                      </div>
                    )}
                    {!c.email && !c.phone && (
                      <span className="text-xs text-zinc-600">–</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {c._count.projects}
                    </span>
                    <span className="text-xs text-zinc-600">Projekte</span>
                  </div>

                  <span className="text-xs text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditClient(c); setModalOpen(true); }}
                      className="p-1.5 rounded hover:bg-[#2a2a2a] text-zinc-500 hover:text-white transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <ClientModal
          client={editClient}
          onClose={() => { setModalOpen(false); setEditClient(null); }}
          onSaved={load}
        />
      )}
    </AppShell>
  );
}
