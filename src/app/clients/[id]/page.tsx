"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Banknote,
  FolderKanban,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  CreditCard,
  Pencil,
  X,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  color: string;
  createdAt: string;
}

interface Quote {
  id: string;
  number: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

interface ClientDetail {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  projects: Project[];
  quotes: Quote[];
  invoices: Invoice[];
}

type ActivityType =
  | "projekt_gestartet"
  | "projekt_abgeschlossen"
  | "angebot_erstellt"
  | "angebot_gesendet"
  | "rechnung_erstellt"
  | "rechnung_bezahlt";

interface ActivityItem {
  id: string;
  type: ActivityType;
  label: string;
  detail: string;
  date: string;
  link: string;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function formatEur(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  projekt_gestartet: <FolderKanban className="w-3.5 h-3.5 text-blue-400" />,
  projekt_abgeschlossen: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  angebot_erstellt: <FileText className="w-3.5 h-3.5 text-zinc-400" />,
  angebot_gesendet: <Send className="w-3.5 h-3.5 text-purple-400" />,
  rechnung_erstellt: <Banknote className="w-3.5 h-3.5 text-orange-400" />,
  rechnung_bezahlt: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />,
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Offen", color: "text-blue-400 bg-blue-900/20" },
  SENT: { label: "Gesendet", color: "text-purple-400 bg-purple-900/20" },
  PAID: { label: "Bezahlt", color: "text-emerald-400 bg-emerald-900/20" },
  PARTIAL: { label: "Teilzahlung", color: "text-yellow-400 bg-yellow-900/20" },
  OVERDUE: { label: "Überfällig", color: "text-red-400 bg-red-900/20" },
  CANCELLED: { label: "Storniert", color: "text-zinc-400 bg-zinc-900/20" },
  DRAFT: { label: "Entwurf", color: "text-zinc-400 bg-zinc-900/20" },
};

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Entwurf", color: "text-zinc-400 bg-zinc-900/20" },
  sent: { label: "Gesendet", color: "text-blue-400 bg-blue-900/20" },
  accepted: { label: "Angenommen", color: "text-emerald-400 bg-emerald-900/20" },
  declined: { label: "Abgelehnt", color: "text-red-400 bg-red-900/20" },
  expired: { label: "Abgelaufen", color: "text-orange-400 bg-orange-900/20" },
  invoiced: { label: "In Rechnung", color: "text-purple-400 bg-purple-900/20" },
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({
  client,
  onClose,
  onSaved,
}: {
  client: ClientDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: client.name,
    contactPerson: client.contactPerson ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    notes: client.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name ist erforderlich"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler");
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
          <h2 className="text-sm font-semibold text-white">Kunde bearbeiten</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 rounded-md hover:bg-[#252525] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-2">{error}</div>}
          {[
            { key: "name", label: "Name *", placeholder: "Mustermann GmbH" },
            { key: "contactPerson", label: "Ansprechpartner", placeholder: "Max Mustermann" },
            { key: "email", label: "E-Mail", placeholder: "info@firma.de" },
            { key: "phone", label: "Telefon", placeholder: "+49 123 4567890" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
              <input
                type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Adresse</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notizen</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#333] text-zinc-400 hover:text-white text-sm transition-colors">Abbrechen</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [clientRes, activityRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/clients/${id}/activity`),
      ]);
      if (clientRes.ok) setClient(await clientRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[50vh] text-zinc-600">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-600 gap-3">
          <Building2 className="w-12 h-12 opacity-30" />
          <p>Kunde nicht gefunden</p>
          <Link href="/clients" className="text-emerald-500 hover:text-emerald-400 text-sm">
            ← Zurück zur Übersicht
          </Link>
        </div>
      </AppShell>
    );
  }

  // Umsatz berechnen
  const umsatzGesamt = client.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.amount, 0);

  const offeneRechnungen = client.invoices.filter((i) =>
    ["OPEN", "SENT", "OVERDUE"].includes(i.status)
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/clients" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Kunden
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{client.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-400">
                {client.name[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              {client.contactPerson && (
                <p className="text-sm text-zinc-400 mt-0.5">{client.contactPerson}</p>
              )}
              <p className="text-xs text-zinc-600 mt-0.5">
                Kunde seit {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] border border-[#333] text-zinc-300 hover:text-white text-sm rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Bearbeiten
          </button>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Projekte", value: client.projects.length, icon: <FolderKanban className="w-4 h-4 text-blue-400" />, color: "blue" },
            { label: "Angebote", value: client.quotes.length, icon: <FileText className="w-4 h-4 text-purple-400" />, color: "purple" },
            { label: "Rechnungen", value: client.invoices.length, icon: <Banknote className="w-4 h-4 text-orange-400" />, color: "orange" },
            { label: "Umsatz", value: formatEur(umsatzGesamt), icon: <CreditCard className="w-4 h-4 text-emerald-400" />, color: "emerald" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-zinc-500">{label}</span></div>
              <div className="text-xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kontaktinfo */}
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Kontaktinfo</h2>
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-sm text-zinc-300 hover:text-emerald-400 transition-colors">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                  <a href={`tel:${client.phone}`} className="text-sm text-zinc-300 hover:text-emerald-400 transition-colors">{client.phone}</a>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-zinc-300 whitespace-pre-line">{client.address}</p>
                </div>
              )}
              {!client.email && !client.phone && !client.address && (
                <p className="text-xs text-zinc-600">Keine Kontaktdaten hinterlegt</p>
              )}
            </div>
            {client.notes && (
              <div className="pt-3 border-t border-[#2a2a2a]">
                <p className="text-xs text-zinc-500 mb-1">Notizen</p>
                <p className="text-sm text-zinc-400 whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Aktivitäts-Zeitstrahl */}
          <div className="lg:col-span-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Aktivitäts-Zeitstrahl</h2>
            {activity.length === 0 ? (
              <p className="text-xs text-zinc-600 py-6 text-center">Noch keine Aktivitäten</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activity.map((item, i) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {/* Timeline-Linie */}
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#333] flex items-center justify-center shrink-0">
                        {ACTIVITY_ICONS[item.type]}
                      </div>
                      {i < activity.length - 1 && (
                        <div className="w-px h-4 bg-[#2a2a2a] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-zinc-300">{item.label}</span>
                        <span className="text-xs text-zinc-600">
                          {new Date(item.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                      </div>
                      <Link href={item.link} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors truncate block">
                        {item.detail}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Projekte */}
        {client.projects.length > 0 && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                Projekte ({client.projects.length})
              </h2>
            </div>
            <div className="divide-y divide-[#2a2a2a]">
              {client.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[#1e1e1e] transition-colors"
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="flex-1 text-sm text-zinc-200 hover:text-white">{p.name}</span>
                  <span className="text-xs text-zinc-600">{p.progress}%</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-emerald-900/30 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Angebote */}
        {client.quotes.length > 0 && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Angebote ({client.quotes.length})
              </h2>
            </div>
            <div className="divide-y divide-[#2a2a2a]">
              {client.quotes.map((q) => {
                const s = QUOTE_STATUS[q.status] ?? { label: q.status, color: "text-zinc-400 bg-zinc-900/20" };
                return (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#1e1e1e] transition-colors">
                    <span className="text-xs font-mono text-zinc-500 w-28 shrink-0">{q.number}</span>
                    <span className="flex-1 text-sm text-zinc-200">{q.title}</span>
                    <span className="text-sm font-medium text-white">{formatEur(q.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Rechnungen */}
        {client.invoices.length > 0 && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-orange-400" />
                Rechnungen ({client.invoices.length})
              </h2>
            </div>
            <div className="divide-y divide-[#2a2a2a]">
              {client.invoices.map((inv) => {
                const s = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "text-zinc-400 bg-zinc-900/20" };
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xs font-mono text-zinc-500 w-28 shrink-0">{inv.number}</span>
                    <span className="flex-1 text-sm text-zinc-400">
                      Fällig: {formatDate(inv.dueDate)}
                      {inv.paidAt && ` · Bezahlt: ${formatDate(inv.paidAt)}`}
                    </span>
                    <span className="text-sm font-medium text-white">{formatEur(inv.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <EditModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSaved={load}
        />
      )}
    </AppShell>
  );
}
