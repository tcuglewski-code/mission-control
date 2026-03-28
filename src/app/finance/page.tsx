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
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ChevronRight,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface Kpis {
  totalRevenue: number;
  openAmount: number;
  overdueAmount: number;
  partialAmount: number;
  openCount: number;
  overdueCount: number;
  paidCount: number;
  partialCount: number;
  dunningLevel1: number;
  dunningLevel2: number;
  dunningLevel3: number;
  totalDunningFees: number;
  recentPaymentsTotal: number;
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

interface DonutData {
  paid: number;
  open: number;
  overdue: number;
  partial: number;
}

interface CashflowInvoice {
  id: string;
  number: string;
  clientName: string | null;
  amount: number;
  dueDate: string;
  status: string;
  dunningLevel: number;
  project: { id: string; name: string; color: string };
}

interface RecentPayment {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
  invoice: {
    number: string;
    project: { name: string; color: string };
  };
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
}

interface Invoice {
  id: string;
  number: string;
  description: string | null;
  amount: number;
  status: "OPEN" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | "DRAFT";
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
  dunningLevel: number;
  dunningFee: number;
  clientName: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
  paymentDate: string | null;
  project: { id: string; name: string; color: string };
  items: InvoiceItem[];
  payments: Payment[];
}

interface Summary {
  kpis: Kpis;
  monthlyRevenue: MonthlyEntry[];
  donutData: DonutData;
  cashflow: { invoices: CashflowInvoice[]; total: number };
  recentPayments: RecentPayment[];
  topProjects: TopProject[];
  openItems: Invoice[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

const STATUS_MAP: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  SENT: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  PARTIAL: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  PAID: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  OVERDUE: "bg-red-500/20 text-red-300 border border-red-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  DRAFT: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  SENT: "Gesendet",
  PARTIAL: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
  DRAFT: "Entwurf",
};

const DUNNING_LABELS: Record<number, string> = {
  1: "M1",
  2: "M2",
  3: "M3",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function DunningBadge({ level }: { level: number }) {
  if (!level) return null;
  const color = level === 1 ? "bg-amber-500/20 text-amber-300" : level === 2 ? "bg-orange-500/20 text-orange-300" : "bg-red-500/20 text-red-300";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {DUNNING_LABELS[level]}
    </span>
  );
}

// ─── Zahlung erfassen Modal ───────────────────────────────────────────────────
interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}

function PaymentModal({ invoice, onClose, onSaved }: PaymentModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const totalPaid = invoice.paymentAmount ?? 0;
  const remaining = invoice.amount - totalPaid;
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(String(remaining > 0 ? remaining.toFixed(2) : invoice.amount.toFixed(2)));
  const [paymentMethod, setPaymentMethod] = useState("Überweisung");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          date: paymentDate,
          method: paymentMethod,
          note: note || undefined,
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
          <h2 className="text-base font-semibold text-white">Zahlung erfassen</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-zinc-900 rounded-lg">
          <p className="text-xs text-zinc-400">Rechnung</p>
          <p className="text-sm font-mono font-medium text-zinc-200">{invoice.number}</p>
          <p className="text-xs text-zinc-500">{invoice.project.name}</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="text-zinc-400">Gesamtbetrag: <strong className="text-zinc-200 font-mono">{formatEur(invoice.amount)}</strong></span>
            {totalPaid > 0 && (
              <span className="text-zinc-400">Bereits bezahlt: <strong className="text-emerald-400 font-mono">{formatEur(totalPaid)}</strong></span>
            )}
            {remaining > 0 && remaining < invoice.amount && (
              <span className="text-zinc-400">Offen: <strong className="text-amber-400 font-mono">{formatEur(remaining)}</strong></span>
            )}
          </div>
        </div>

        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mb-4 p-3 bg-zinc-900 rounded-lg">
            <p className="text-xs text-zinc-400 mb-2">Bisherige Zahlungen</p>
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-xs text-zinc-400">
                <span>{new Date(p.date).toLocaleDateString("de-DE")} · {p.method}</span>
                <span className="font-mono text-emerald-400">{formatEur(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
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
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notiz (optional)</label>
            <input
              type="text"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. Referenz-Nr…"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
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
            {saving ? "Speichere…" : "Zahlung erfassen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mahnung Modal ────────────────────────────────────────────────────────────
function DunningModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentLevel = invoice.dunningLevel ?? 0;
  const nextLevel = currentLevel + 1;
  const FEES: Record<number, number> = { 1: 5, 2: 10, 3: 25 };

  async function handleDunning() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoice.id}/dunning`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Fehler");
      setLoading(false);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1c1c1e] border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Mahnung senden</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-500" /></button>
        </div>

        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">Mahnstufe {nextLevel} setzen</p>
          </div>
          <p className="text-xs text-zinc-400">
            Rechnung {invoice.number} · {invoice.clientName ?? invoice.project.name}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Mahngebühr für Stufe {nextLevel}: <strong className="text-amber-300">{FEES[nextLevel] ?? 0}€</strong>
            {(invoice.dunningFee ?? 0) > 0 && (
              <span> · Bisherige Gebühren: {invoice.dunningFee}€</span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-300">{error}</div>
        )}

        <p className="text-sm text-zinc-400 mb-5">
          Mit dieser Aktion wird die Mahnstufe auf {nextLevel} gesetzt und eine Mahngebühr von {FEES[nextLevel] ?? 0}€ erfasst.
          Sie können anschließend die Mahnungs-PDF drucken.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleDunning}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Wird gesetzt…" : `Mahnstufe ${nextLevel} setzen`}
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
  const toX = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * (W - pad.left - pad.right);
  const toY = (v: number) => pad.top + (1 - v / maxVal) * (H - pad.top - pad.bottom);
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

// ─── Donut-Chart: Offen vs. Bezahlt ──────────────────────────────────────────
function DonutChart({ data }: { data: DonutData }) {
  const segments = [
    { label: "Bezahlt", value: data.paid, color: "#10b981" },
    { label: "Offen", value: data.open, color: "#3b82f6" },
    { label: "Überfällig", value: data.overdue, color: "#ef4444" },
    { label: "Teilbezahlt", value: data.partial, color: "#f59e0b" },
  ].filter((s) => s.value > 0);

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-zinc-500 text-sm">Keine Daten</p>;

  const R = 60;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 22;

  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    return { ...seg, d: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`, pct: (seg.value / total) * 100 };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-32 h-32 flex-shrink-0">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-zinc-200" style={{ fontSize: 16, fontWeight: 700 }}>
          {formatEur(total).replace("€", "").trim()}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 9 }}>
          Gesamt
        </text>
      </svg>
      <div className="space-y-2">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-xs text-zinc-400 w-24">{arc.label}</span>
            <span className="text-xs font-mono text-zinc-200">{formatEur(arc.value)}</span>
            <span className="text-xs text-zinc-600">({arc.pct.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cashflow-Prognose ────────────────────────────────────────────────────────
function CashflowSection({ cashflow }: { cashflow: { invoices: CashflowInvoice[]; total: number } }) {
  const now = new Date();
  const groups = [
    { label: "Überfällig", color: "#ef4444", items: cashflow.invoices.filter((inv) => new Date(inv.dueDate) < now) },
    { label: "Diese Woche", color: "#f59e0b", items: cashflow.invoices.filter((inv) => {
      const d = new Date(inv.dueDate);
      const in7 = new Date(); in7.setDate(now.getDate() + 7);
      return d >= now && d <= in7;
    })},
    { label: "Nächste 30 Tage", color: "#3b82f6", items: cashflow.invoices.filter((inv) => {
      const d = new Date(inv.dueDate);
      const in7 = new Date(); in7.setDate(now.getDate() + 7);
      const in30 = new Date(); in30.setDate(now.getDate() + 30);
      return d > in7 && d <= in30;
    })},
  ];

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Cashflow-Prognose (nächste 30 Tage)</h2>
        </div>
        <span className="text-sm font-mono font-bold text-blue-400">{formatEur(cashflow.total)}</span>
      </div>
      {cashflow.invoices.length === 0 ? (
        <p className="text-zinc-500 text-sm">Keine offenen Forderungen in den nächsten 30 Tagen.</p>
      ) : (
        <div className="space-y-4">
          {groups.filter((g) => g.items.length > 0).map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-xs font-medium" style={{ color: g.color }}>{g.label}</span>
                <span className="text-xs text-zinc-500">
                  ({g.items.length} · {formatEur(g.items.reduce((s, inv) => s + inv.amount, 0))})
                </span>
              </div>
              <div className="space-y-1.5">
                {g.items.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs bg-zinc-900/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: inv.project.color }} />
                      <span className="font-mono text-zinc-300">{inv.number}</span>
                      {inv.clientName && <span className="text-zinc-500">{inv.clientName}</span>}
                      {inv.dunningLevel > 0 && <DunningBadge level={inv.dunningLevel} />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500">
                        {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                      </span>
                      <span className="font-mono font-semibold text-zinc-200">{formatEur(inv.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [dunningModal, setDunningModal] = useState<Invoice | null>(null);
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

  const filteredInvoices = statusFilter === "ALL"
    ? allInvoices
    : allInvoices.filter((inv) => inv.status === statusFilter);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const eligible = filteredInvoices.filter((inv) => ["OPEN", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status));
    if (selectedIds.size === eligible.length && eligible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map((inv) => inv.id)));
    }
  }

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

  const { kpis, monthlyRevenue, donutData, cashflow, recentPayments, topProjects } = summary;
  const eligibleForBulk = filteredInvoices.filter((inv) => ["OPEN", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status));
  const allEligibleSelected = eligibleForBulk.length > 0 && eligibleForBulk.every((inv) => selectedIds.has(inv.id));

  return (
    <AppShell title="Finanzen" subtitle="Rechnungs- & Finanz-Übersicht">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Link
            href="/invoice-templates"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Rechnungsvorlagen
          </Link>
        </div>

        {/* ─── KPI-Karten ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <KpiCard label="Gesamtumsatz" value={formatEur(kpis.totalRevenue)} color="emerald" />
          <KpiCard label="Offen (€)" value={formatEur(kpis.openAmount)} color="blue" />
          <KpiCard label="Überfällig (€)" value={formatEur(kpis.overdueAmount)} color="red" />
          <KpiCard label="Teilbezahlt (€)" value={formatEur(kpis.partialAmount)} color="amber" />
          <KpiCard label="Zahlungen (30T)" value={formatEur(kpis.recentPaymentsTotal)} color="emerald" />
          <KpiCard label="Mahnungen" value={`${kpis.dunningLevel1 + kpis.dunningLevel2 + kpis.dunningLevel3}`} color="amber"
            sub={kpis.totalDunningFees > 0 ? `${formatEur(kpis.totalDunningFees)} Gebühren` : undefined} />
          <KpiCard label="Offen (Anzahl)" value={String(kpis.openCount)} color="blue" />
          <KpiCard label="Bezahlt (Anzahl)" value={String(kpis.paidCount)} color="emerald" />
        </div>

        {/* ─── Mahnwesen-Warnung ──────────────────────────────────────────────── */}
        {(kpis.dunningLevel1 + kpis.dunningLevel2 + kpis.dunningLevel3) > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">Offene Mahnvorgänge</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {kpis.dunningLevel1 > 0 && `${kpis.dunningLevel1}× 1. Mahnung`}
                {kpis.dunningLevel2 > 0 && ` · ${kpis.dunningLevel2}× 2. Mahnung`}
                {kpis.dunningLevel3 > 0 && ` · ${kpis.dunningLevel3}× 3. Mahnung`}
                {kpis.totalDunningFees > 0 && ` · Gesamtgebühren: ${formatEur(kpis.totalDunningFees)}`}
              </p>
            </div>
            <button
              onClick={() => setStatusFilter("OVERDUE")}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Anzeigen <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── Charts: Liniendiagramm + Donut ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">📈 Monatliche Einnahmen (letzte 12 Monate)</h2>
            {monthlyRevenue.length > 0 ? (
              <LineChart data={monthlyRevenue} />
            ) : (
              <p className="text-zinc-500 text-sm">Noch keine Einnahmen erfasst.</p>
            )}
          </div>

          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">🍩 Forderungen nach Status</h2>
            <DonutChart data={donutData} />
          </div>
        </div>

        {/* ─── Cashflow-Prognose ─────────────────────────────────────────────── */}
        <CashflowSection cashflow={cashflow} />

        {/* ─── Letzte Zahlungseingänge ────────────────────────────────────────── */}
        {recentPayments.length > 0 && (
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">
              <span className="mr-1">💳</span>
              Letzte Zahlungseingänge (30 Tage)
            </h2>
            <div className="space-y-2">
              {recentPayments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-2 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.invoice.project.color }} />
                    <span className="text-zinc-400">{new Date(p.date).toLocaleDateString("de-DE")}</span>
                    <span className="font-mono text-zinc-300">{p.invoice.number}</span>
                    <span className="text-zinc-500">{p.invoice.project.name}</span>
                    <span className="text-zinc-600">{p.method}</span>
                  </div>
                  <span className="font-mono font-semibold text-emerald-400">{formatEur(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Top-Projekte ───────────────────────────────────────────────────── */}
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
                        <span className="truncate max-w-[200px]">{p.name}</span>
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

        {/* ─── Rechnungs-Tabelle ─────────────────────────────────────────────── */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">🧾 Alle Rechnungen</h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
                <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
                {(["ALL", "OPEN", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED", "DRAFT"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      statusFilter === s ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {s === "ALL" ? "Alle" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkPaid}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {bulkLoading ? "Wird gespeichert…" : `${selectedIds.size} als bezahlt`}
                </button>
              )}

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                DATEV-Export
              </button>
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Keine Rechnungen gefunden.</div>
          ) : (
            <>
              {/* ── Mobile Card-Ansicht (< sm) ─────────────────────────────── */}
              <div className="sm:hidden divide-y divide-zinc-800">
                {filteredInvoices.map((inv) => {
                  const isEligible = ["OPEN", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status);
                  const isSelected = selectedIds.has(inv.id);
                  const canDunning = inv.status === "OVERDUE" && (inv.dunningLevel ?? 0) < 3;
                  const totalPaid = inv.paymentAmount ?? 0;
                  return (
                    <div key={inv.id} className={`p-4 ${isSelected ? "bg-emerald-900/10" : ""}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isEligible && (
                            <button onClick={() => toggleSelect(inv.id)} className="text-zinc-500 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-3">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                            </button>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-zinc-200">{inv.number}</span>
                              {(inv.dunningLevel ?? 0) > 0 && <DunningBadge level={inv.dunningLevel} />}
                              <StatusBadge status={inv.status} />
                            </div>
                            <Link href={`/projects/${inv.project.id}/finance`}
                              className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inv.project.color }} />
                              <span className="truncate">{inv.project.name}</span>
                            </Link>
                            {inv.clientName && <p className="text-xs text-zinc-500 mt-0.5">{inv.clientName}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-zinc-200">{formatEur(inv.amount)}</div>
                          {totalPaid > 0 && (
                            <div className="text-xs font-mono text-emerald-400">{formatEur(totalPaid)} bezahlt</div>
                          )}
                          <div className="text-xs text-zinc-500 mt-0.5">{new Date(inv.dueDate).toLocaleDateString("de-DE")}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Link href={`/invoices/${inv.id}/pdf`}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors min-h-[36px]">
                          <Printer className="w-3.5 h-3.5" /> PDF
                        </Link>
                        {isEligible && (
                          <button onClick={() => setPaymentModal(inv)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors min-h-[36px]">
                            <CreditCard className="w-3.5 h-3.5" /> Zahlung
                          </button>
                        )}
                        {canDunning && (
                          <button onClick={() => setDunningModal(inv)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors min-h-[36px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Mahnung
                          </button>
                        )}
                        <Link href={`/projects/${inv.project.id}/finance`}
                          className="ml-auto p-2 text-zinc-500 hover:text-zinc-300 transition-colors min-h-[36px] flex items-center">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop Tabelle (≥ sm) ─────────────────────────────────── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-white transition-colors">
                          {allEligibleSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nummer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Projekt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Kunde</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Betrag</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Bezahlt</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Fällig</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredInvoices.map((inv) => {
                      const isEligible = ["OPEN", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status);
                      const isSelected = selectedIds.has(inv.id);
                      const canDunning = inv.status === "OVERDUE" && (inv.dunningLevel ?? 0) < 3;
                      const totalPaid = inv.paymentAmount ?? 0;
                      return (
                        <tr key={inv.id} className={`hover:bg-zinc-900/50 transition-colors ${isSelected ? "bg-emerald-900/10" : ""}`}>
                          <td className="px-4 py-3">
                            {isEligible ? (
                              <button onClick={() => toggleSelect(inv.id)} className="text-zinc-500 hover:text-white transition-colors">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                              </button>
                            ) : <span className="w-4 h-4 block" />}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-zinc-300">{inv.number}</span>
                              {(inv.dunningLevel ?? 0) > 0 && <DunningBadge level={inv.dunningLevel} />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/projects/${inv.project.id}/finance`}
                              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors max-w-[140px]">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: inv.project.color }} />
                              <span className="truncate">{inv.project.name}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 max-w-[120px] truncate">
                            {inv.clientName ?? <span className="text-zinc-700">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-200 whitespace-nowrap">
                            {formatEur(inv.amount)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {totalPaid > 0 ? (
                              <span className="text-emerald-400">{formatEur(totalPaid)}</span>
                            ) : (
                              <span className="text-zinc-700">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                            {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/invoices/${inv.id}/pdf`} title="PDF"
                                className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors rounded">
                                <Printer className="w-4 h-4" />
                              </Link>
                              {isEligible && (
                                <button title="Zahlung erfassen" onClick={() => setPaymentModal(inv)}
                                  className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors rounded">
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                              {canDunning && (
                                <button title="Mahnung setzen" onClick={() => setDunningModal(inv)}
                                  className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors rounded">
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                              {(inv.dunningLevel ?? 0) > 0 && (
                                <Link href={`/invoices/${inv.id}/mahnung`} title="Mahnungs-PDF"
                                  className="p-1.5 text-zinc-500 hover:text-amber-300 transition-colors rounded">
                                  <Clock className="w-4 h-4" />
                                </Link>
                              )}
                              <Link href={`/projects/${inv.project.id}/finance`} title="Im Projekt"
                                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
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
            </>
          )}

          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>{filteredInvoices.length} Rechnung(en)</span>
            <span>Summe: {formatEur(filteredInvoices.reduce((s, inv) => s + inv.amount, 0))}</span>
          </div>
        </div>
      </div>

      {paymentModal && (
        <PaymentModal invoice={paymentModal} onClose={() => setPaymentModal(null)} onSaved={loadData} />
      )}
      {dunningModal && (
        <DunningModal invoice={dunningModal} onClose={() => setDunningModal(null)} onSaved={loadData} />
      )}
    </AppShell>
  );
}

function KpiCard({
  label, value, color, sub,
}: {
  label: string;
  value: string;
  color: "emerald" | "blue" | "red" | "amber";
  sub?: string;
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
      <span className={`text-base font-bold font-mono ${colorMap[color]}`}>{value}</span>
      {sub && <span className="text-[10px] text-zinc-600">{sub}</span>}
    </div>
  );
}
