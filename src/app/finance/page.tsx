"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  Download,
  CheckSquare,
  Square,
  Filter,
  CreditCard,
  X,
  ExternalLink,
  Printer,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface Kpis {
  totalRevenue: number;
  openAmount: number;
  overdueAmount: number;
  openCount: number;
  overdueCount: number;
  paidCount: number;
}

interface MonthlyEntry {
  month: string;
  amount: number;
}

interface TopProject {
  id: string;
  name: string;
  color: string;
  amount: number;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface Invoice {
  id: string;
  number: string;
  description: string | null;
  amount: number;
  status: "OPEN" | "PAID" | "OVERDUE" | "CANCELLED" | "DRAFT";
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
  clientName: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
  paymentDate: string | null;
  project: { id: string; name: string; color: string };
  items: InvoiceItem[];
}

interface Summary {
  kpis: Kpis;
  monthlyRevenue: MonthlyEntry[];
  topProjects: TopProject[];
  openItems: Invoice[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

const STATUS_MAP: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  PAID: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  OVERDUE: "bg-red-500/20 text-red-300 border border-red-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  DRAFT: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
  DRAFT: "Entwurf",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Zahlungseingang Modal ─────────────────────────────────────────────────────
interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}

function PaymentModal({ invoice, onClose, onSaved }: PaymentModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(String(invoice.amount.toFixed(2)));
  const [paymentMethod, setPaymentMethod] = useState("Überweisung");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paidAt: paymentDate,
          paymentDate,
          paymentAmount: parseFloat(paymentAmount),
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1c1c1e] border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Zahlungseingang erfassen</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-zinc-900 rounded-lg">
          <p className="text-xs text-zinc-400">Rechnung</p>
          <p className="text-sm font-mono font-medium text-zinc-200">{invoice.number}</p>
          <p className="text-xs text-zinc-500">{invoice.project.name}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Eingangsdatum</label>
            <input
              type="date"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Betrag (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Zahlungsart</label>
            <select
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Überweisung</option>
              <option>Bar</option>
              <option>EC-Karte</option>
              <option>PayPal</option>
              <option>Lastschrift</option>
              <option>Sonstige</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Speichere…" : "Zahlungseingang bestätigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Liniendiagramm ───────────────────────────────────────────────────────
function LineChart({ data }: { data: MonthlyEntry[] }) {
  const W = 600;
  const H = 160;
  const pad = { top: 20, right: 20, bottom: 36, left: 60 };

  const maxVal = Math.max(...data.map((d) => d.amount), 1);

  const toX = (i: number) =>
    pad.left + (i / Math.max(data.length - 1, 1)) * (W - pad.left - pad.right);
  const toY = (v: number) =>
    pad.top + (1 - v / maxVal) * (H - pad.top - pad.bottom);

  const points = data.map((d, i) => `${toX(i)},${toY(d.amount)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: toY(f * maxVal),
    label: formatEur(f * maxVal),
  }));
  const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const xLabels = data.map((d, i) => {
    const [year, month] = d.month.split("-");
    return { x: toX(i), label: `${monthLabels[parseInt(month) - 1]} ${year.slice(2)}` };
  });
  const areaPoints = [
    `${toX(0)},${H - pad.bottom}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.amount)}`),
    `${toX(data.length - 1)},${H - pad.bottom}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={pad.left} y1={tick.y} x2={W - pad.right} y2={tick.y} stroke="#27272a" strokeWidth="1" />
          <text x={pad.left - 6} y={tick.y + 4} textAnchor="end" className="fill-zinc-500" style={{ fontSize: 9 }}>
            {tick.label === "€0,00" ? "0" : tick.label}
          </text>
        </g>
      ))}
      <polygon points={areaPoints} fill="url(#chartGradient)" />
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.amount)} r="3"
          fill={d.amount > 0 ? "#10b981" : "#3f3f46"} stroke="#0f0f0f" strokeWidth="1.5" />
      ))}
      {xLabels.map((lbl, i) =>
        i % 2 === 0 ? (
          <text key={i} x={lbl.x} y={H - 6} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 9 }}>
            {lbl.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        fetch("/api/finance/summary"),
        fetch("/api/invoices"),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setAllInvoices(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Gefilterte Rechnungen
  const filteredInvoices = statusFilter === "ALL"
    ? allInvoices
    : allInvoices.filter((inv) => inv.status === statusFilter);

  // Selektion
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const eligible = filteredInvoices.filter((inv) => ["OPEN", "OVERDUE"].includes(inv.status));
    if (selectedIds.size === eligible.length && eligible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map((inv) => inv.id)));
    }
  }

  // Bulk: Als bezahlt markieren
  async function handleBulkPaid() {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} Rechnung(en) als bezahlt markieren?`)) return;
    setBulkLoading(true);
    try {
      await fetch("/api/invoices/bulk-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      await loadData();
    } finally {
      setBulkLoading(false);
    }
  }

  // CSV Export
  function handleExport() {
    const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
    window.open(`/api/invoices/export${params}`, "_blank");
  }

  if (loading) {
    return (
      <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
        <div className="p-6 flex items-center justify-center h-64 text-zinc-500">Lade Finanzdaten…</div>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
        <div className="p-6 text-red-400">Fehler beim Laden der Finanzdaten.</div>
      </AppShell>
    );
  }

  const { kpis, monthlyRevenue, topProjects } = summary;
  const eligibleForBulk = filteredInvoices.filter((inv) => ["OPEN", "OVERDUE"].includes(inv.status));
  const allEligibleSelected = eligibleForBulk.length > 0 && eligibleForBulk.every((inv) => selectedIds.has(inv.id));

  return (
    <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Gesamtumsatz" value={formatEur(kpis.totalRevenue)} color="emerald" />
          <KpiCard label="Offen (Betrag)" value={formatEur(kpis.openAmount)} color="blue" />
          <KpiCard label="Überfällig (Betrag)" value={formatEur(kpis.overdueAmount)} color="red" />
          <KpiCard label="Offene Rechnungen" value={String(kpis.openCount)} color="blue" />
          <KpiCard label="Überfällige Rechnungen" value={String(kpis.overdueCount)} color="red" />
          <KpiCard label="Bezahlte Rechnungen" value={String(kpis.paidCount)} color="emerald" />
        </div>

        {/* Liniendiagramm */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">📈 Monatliche Einnahmen (letzte 12 Monate)</h2>
          {monthlyRevenue.length > 0 ? (
            <LineChart data={monthlyRevenue} />
          ) : (
            <p className="text-zinc-500 text-sm">Noch keine Einnahmen erfasst.</p>
          )}
        </div>

        {/* Top-Projekte */}
        {topProjects.length > 0 && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">🏆 Top-5 Projekte nach Umsatz</h2>
            <div className="space-y-3">
              {topProjects.map((p) => {
                const maxAmt = topProjects[0].amount;
                const pct = maxAmt > 0 ? (p.amount / maxAmt) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between items-center mb-1">
                      <Link href={`/projects/${p.id}/finance`}
                        className="flex items-center gap-2 text-sm text-zinc-200 hover:text-white transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate max-w-[180px]">{p.name}</span>
                      </Link>
                      <span className="text-xs text-emerald-400 font-mono font-medium">{formatEur(p.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Rechnungs-Tabelle mit Filter + Bulk ──────────────────────── */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">🧾 Alle Rechnungen</h2>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status-Filter */}
              <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
                <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
                {(["ALL", "OPEN", "PAID", "OVERDUE", "CANCELLED", "DRAFT"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      statusFilter === s
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {s === "ALL" ? "Alle" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* Bulk-Aktionen */}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkPaid}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {bulkLoading ? "Wird gespeichert…" : `${selectedIds.size} als bezahlt markieren`}
                </button>
              )}

              {/* CSV Export */}
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                DATEV-Export
              </button>
            </div>
          </div>

          {/* Tabelle */}
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Keine Rechnungen gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Alle auswählen"
                      >
                        {allEligibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nummer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Projekt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Kunde</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Betrag</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Fällig am</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Bezahlt am</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredInvoices.map((inv) => {
                    const isEligible = ["OPEN", "OVERDUE"].includes(inv.status);
                    const isSelected = selectedIds.has(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-zinc-900/50 transition-colors ${isSelected ? "bg-emerald-900/10" : ""}`}
                      >
                        <td className="px-4 py-3">
                          {isEligible ? (
                            <button
                              onClick={() => toggleSelect(inv.id)}
                              className="text-zinc-500 hover:text-white transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">
                          {inv.number}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/projects/${inv.project.id}/finance`}
                            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors max-w-[160px]"
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: inv.project.color }} />
                            <span className="truncate">{inv.project.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 max-w-[140px] truncate">
                          {inv.clientName || <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-200 whitespace-nowrap">
                          {formatEur(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(inv.invoiceDate).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {inv.paidAt ? (
                            <span>
                              {new Date(inv.paidAt).toLocaleDateString("de-DE")}
                              {inv.paymentMethod && (
                                <span className="ml-1 text-zinc-600">({inv.paymentMethod})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {/* PDF-Link */}
                            <Link
                              href={`/invoices/${inv.id}/pdf`}
                              title="PDF anzeigen"
                              className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors rounded"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>

                            {/* Zahlungseingang */}
                            {isEligible && (
                              <button
                                title="Zahlungseingang erfassen"
                                onClick={() => setPaymentModal(inv)}
                                className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors rounded"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}

                            {/* Projekt-Link */}
                            <Link
                              href={`/projects/${inv.project.id}/finance`}
                              title="Im Projekt anzeigen"
                              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>{filteredInvoices.length} Rechnung(en)</span>
            <span>
              Summe: {formatEur(filteredInvoices.reduce((s, inv) => s + inv.amount, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Zahlungseingang Modal */}
      {paymentModal && (
        <PaymentModal
          invoice={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSaved={loadData}
        />
      )}
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "red" | "amber";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    red: "text-red-400",
    amber: "text-amber-400",
  };
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-lg font-bold font-mono ${colorMap[color]}`}>{value}</span>
    </div>
  );
}
