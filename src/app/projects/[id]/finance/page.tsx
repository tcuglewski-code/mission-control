"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft, Plus, Printer, Trash2, X, CheckCircle } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
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
  invoiceDate?: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  project: { id: string; name: string; color: string };
  items?: InvoiceItem[];
}

interface Project {
  id: string;
  name: string;
  color: string;
  budget: number | null;
  budgetUsed: number | null;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    PAID: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    OVERDUE: "bg-red-500/20 text-red-300 border border-red-500/30",
    CANCELLED: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  };
  const labels: Record<string, string> = {
    OPEN: "Offen",
    PAID: "Bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// Rechnungsformular ausgelagert in: /projects/[id]/invoices/new/page.tsx

// ─── Print CSS ────────────────────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body { background: white !important; color: black !important; font-family: Arial, sans-serif; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .invoice-table { width: 100%; border-collapse: collapse; }
  .invoice-table th, .invoice-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  .invoice-table th { background: #f5f5f5; }
  @page { margin: 2cm; }
}
.print-only { display: none; }
`;

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function ProjectFinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  // Rechnungsformular ist eine eigene Seite: /projects/[id]/invoices/new

  const loadData = useCallback(async () => {
    try {
      const [projRes, invRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/invoices?projectId=${projectId}`),
      ]);
      if (projRes.ok) {
        const p = await projRes.json();
        setProject(p);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStatusChange(invoice: Invoice, newStatus: string) {
    const paidAt = newStatus === "PAID" ? new Date().toISOString() : null;
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, paidAt }),
    });
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Rechnung wirklich löschen?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    loadData();
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <AppShell title="Projekt-Finanzen" subtitle="Wird geladen…">
        <div className="p-6 flex items-center justify-center h-64 text-zinc-500">
          Lade Finanzdaten…
        </div>
      </AppShell>
    );
  }

  // Berechnungen
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.amount, 0);
  const totalPaid = invoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + inv.amount, 0);
  const totalOpen = invoices.filter((inv) => ["OPEN", "OVERDUE"].includes(inv.status)).reduce((s, inv) => s + inv.amount, 0);
  const budget = project?.budget ?? 0;
  const budgetUsed = project?.budgetUsed ?? 0;
  const budgetPct = budget > 0 ? Math.min((budgetUsed / budget) * 100, 100) : 0;
  const budgetColor = budgetPct >= 90 ? "#ef4444" : budgetPct >= 70 ? "#f59e0b" : "#10b981";

  const projectName = project?.name ?? "Projekt";

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Print-Header (nur beim Drucken sichtbar) */}
      <div className="print-only p-8">
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>
          Koch Aufforstung GmbH — Rechnungsübersicht
        </h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Projekt: {projectName} · Stand: {new Date().toLocaleDateString("de-DE")}
        </p>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Beschreibung</th>
              <th>Betrag</th>
              <th>Status</th>
              <th>Fälligkeitsdatum</th>
              <th>Bezahlt am</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.number}</td>
                <td>{inv.description ?? "—"}</td>
                <td>{formatEur(inv.amount)}</td>
                <td>{inv.status}</td>
                <td>{new Date(inv.dueDate).toLocaleDateString("de-DE")}</td>
                <td>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("de-DE") : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><strong>Gesamt</strong></td>
              <td><strong>{formatEur(totalInvoiced)}</strong></td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <AppShell title="Projekt-Finanzen" subtitle={projectName}>
        <div className="p-6 space-y-6 max-w-5xl mx-auto no-print">

          {/* Zurück + Aktionen */}
          <div className="flex items-center justify-between">
            <Link href={`/projects/${projectId}`}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Zurück zum Projekt
            </Link>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <Printer className="w-4 h-4" />
                PDF exportieren
              </button>
              <Link
                href={`/projects/${projectId}/invoices/new`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Neue Rechnung
              </Link>
            </div>
          </div>

          {/* KPI-Karten */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Gesamt fakturiert" value={formatEur(totalInvoiced)} color="zinc" />
            <KpiCard label="Bezahlt" value={formatEur(totalPaid)} color="emerald" />
            <KpiCard label="Offen / Überfällig" value={formatEur(totalOpen)} color="blue" />
            <KpiCard label="Rechnungen" value={String(invoices.length)} color="zinc" />
          </div>

          {/* Budget vs. Kosten */}
          {budget > 0 && (
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">💰 Budget vs. tatsächliche Kosten</h2>
              <div className="flex justify-between text-xs text-zinc-400 mb-2">
                <span>Verbraucht: {formatEur(budgetUsed)}</span>
                <span>Budget: {formatEur(budget)}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${budgetPct}%`, backgroundColor: budgetColor }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-zinc-500">{budgetPct.toFixed(1)}% verbraucht</span>
                <span className={budgetPct >= 90 ? "text-red-400" : "text-zinc-500"}>
                  {formatEur(budget - budgetUsed)} verbleibend
                </span>
              </div>
            </div>
          )}

          {/* Rechnungs-Tabelle */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-200">🧾 Rechnungen</h2>
            </div>

            {invoices.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Noch keine Rechnungen für dieses Projekt.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nummer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Beschreibung</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Betrag</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Fällig am</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Bezahlt am</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">
                          {inv.number}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">
                          {inv.description ?? <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-200 whitespace-nowrap">
                          {formatEur(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {statusBadge(inv.status)}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {inv.paidAt
                            ? new Date(inv.paidAt).toLocaleDateString("de-DE")
                            : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/invoices/${inv.id}/pdf`}
                              title="PDF anzeigen"
                              className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors rounded"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                            {(inv.status === "OPEN" || inv.status === "OVERDUE") && (
                              <button
                                title="Als bezahlt markieren"
                                onClick={() => handleStatusChange(inv, "PAID")}
                                className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors rounded"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {inv.status !== "CANCELLED" && inv.status !== "PAID" && (
                              <button
                                title="Stornieren"
                                onClick={() => handleStatusChange(inv, "CANCELLED")}
                                className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              title="Löschen"
                              onClick={() => handleDelete(inv.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-700 bg-zinc-900/50">
                      <td className="px-4 py-3 text-xs font-semibold text-zinc-400" colSpan={2}>
                        Gesamt
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {formatEur(totalInvoiced)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppShell>

      {/* Modals are now separate pages — /projects/[id]/invoices/new */}
    </>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "red" | "amber" | "zinc";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    red: "text-red-400",
    amber: "text-amber-400",
    zinc: "text-zinc-200",
  };
  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-base font-bold font-mono ${colorMap[color]}`}>{value}</span>
    </div>
  );
}
