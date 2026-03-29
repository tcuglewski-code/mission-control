"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  Plus,
  FileText,
  Mail,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileX,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface Quote {
  id: string;
  number: string;
  projectId: string | null;
  clientName: string;
  clientEmail: string | null;
  title: string;
  items: QuoteItem[];
  validUntil: string;
  status: string;
  note: string | null;
  amount: number;
  invoiceId: string | null;
  createdAt: string;
}

// ─── Status-Konfiguration ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: "Entwurf",
    color: "bg-zinc-700 text-zinc-300",
    icon: <FileText className="w-3 h-3" />,
  },
  sent: {
    label: "Gesendet",
    color: "bg-blue-900/50 text-blue-300",
    icon: <Send className="w-3 h-3" />,
  },
  accepted: {
    label: "Angenommen",
    color: "bg-emerald-900/50 text-emerald-300",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  declined: {
    label: "Abgelehnt",
    color: "bg-red-900/50 text-red-300",
    icon: <XCircle className="w-3 h-3" />,
  },
  expired: {
    label: "Abgelaufen",
    color: "bg-orange-900/50 text-orange-300",
    icon: <Clock className="w-3 h-3" />,
  },
  invoiced: {
    label: "In Rechnung",
    color: "bg-purple-900/50 text-purple-300",
    icon: <CreditCard className="w-3 h-3" />,
  },
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isExpired(validUntil: string): boolean {
  return new Date(validUntil) < new Date();
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/quotes");
      if (r.ok) setQuotes(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Status-Update
  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      const r = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
        showMsg("success", "Status aktualisiert");
      } else {
        showMsg("error", "Fehler beim Aktualisieren");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // In Rechnung umwandeln
  const convertToInvoice = async (id: string) => {
    setActionLoading(id + "convert");
    try {
      const r = await fetch(`/api/quotes/${id}/convert`, { method: "POST" });
      const data = await r.json();
      if (r.ok) {
        showMsg("success", `Rechnung ${data.invoice.number} erstellt!`);
        setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status: "invoiced", invoiceId: data.invoice.id } : q)));
      } else {
        showMsg("error", data.error ?? "Fehler beim Umwandeln");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Erinnerung senden
  const sendReminder = async (id: string) => {
    setActionLoading(id + "remind");
    try {
      const r = await fetch(`/api/quotes/${id}/remind`, { method: "POST" });
      const data = await r.json();
      if (r.ok) {
        showMsg(
          "success",
          data.placeholder
            ? `Erinnerung vorgemerkt (kein SMTP konfiguriert). Empfänger: ${data.recipient ?? "–"}`
            : "Erinnerung gesendet!"
        );
      } else {
        showMsg("error", data.error ?? "Fehler beim Senden");
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Löschen
  const deleteQuote = async (id: string) => {
    if (!confirm("Angebot wirklich löschen?")) return;
    setActionLoading(id + "delete");
    try {
      const r = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (r.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
        showMsg("success", "Angebot gelöscht");
      } else {
        showMsg("error", "Fehler beim Löschen");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filterStatus === "all" ? quotes : quotes.filter((q) => q.status === filterStatus);

  // KPIs
  const totalAmount = filtered.reduce((s, q) => s + q.amount, 0);
  const sentCount = quotes.filter((q) => q.status === "sent").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const declinedCount = quotes.filter((q) => q.status === "declined").length;
  const annahmerate =
    acceptedCount + declinedCount > 0
      ? Math.round((acceptedCount / (acceptedCount + declinedCount)) * 100)
      : null;

  return (
    <AppShell title="Angebote">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Angebote</h1>
            <p className="text-zinc-400 text-sm mt-1">Alle Angebote verwalten und nachverfolgen</p>
          </div>
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neues Angebot
          </Link>
        </div>

        {/* Toast */}
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                : "bg-red-900/50 text-red-300 border border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* KPI-Leiste */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Gesamt</div>
            <div className="text-xl font-bold text-white">{quotes.length}</div>
            <div className="text-xs text-zinc-500">Angebote</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Offen (gesendet)</div>
            <div className="text-xl font-bold text-blue-400">{sentCount}</div>
            <div className="text-xs text-zinc-500">warten auf Antwort</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Annahmerate</div>
            <div className="text-xl font-bold text-emerald-400">
              {annahmerate !== null ? `${annahmerate}%` : "–"}
            </div>
            <div className="text-xs text-zinc-500">accepted/declined</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-1">Volumen (Filter)</div>
            <div className="text-xl font-bold text-white">{formatEur(totalAmount)}</div>
            <div className="text-xs text-zinc-500">Brutto gesamt</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "draft", "sent", "accepted", "declined", "expired", "invoiced"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {s === "all" ? "Alle" : (STATUS_CONFIG[s]?.label ?? s)}
              {s !== "all" && (
                <span className="ml-1.5 opacity-60">
                  {quotes.filter((q) => q.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tabelle */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Lade Angebote…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <FileX className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div>Keine Angebote gefunden</div>
            <Link href="/quotes/new" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
              Erstes Angebot erstellen →
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Nummer</th>
                  <th className="px-4 py-3 text-left">Titel</th>
                  <th className="px-4 py-3 text-left">Kunde</th>
                  <th className="px-4 py-3 text-left">Gültig bis</th>
                  <th className="px-4 py-3 text-right">Betrag</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote) => {
                  const cfg = STATUS_CONFIG[quote.status] ?? {
                    label: quote.status,
                    color: "bg-zinc-700 text-zinc-300",
                    icon: null,
                  };
                  const expired = isExpired(quote.validUntil) && !["accepted", "declined", "invoiced"].includes(quote.status);

                  return (
                    <tr
                      key={quote.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Nummer */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/quotes/${quote.id}/pdf`}
                          className="font-mono text-xs text-zinc-300 hover:text-white"
                        >
                          {quote.number}
                        </Link>
                      </td>

                      {/* Titel */}
                      <td className="px-4 py-3">
                        <div className="text-white font-medium truncate max-w-[200px]">{quote.title}</div>
                        {quote.note && (
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">{quote.note}</div>
                        )}
                      </td>

                      {/* Kunde */}
                      <td className="px-4 py-3">
                        <div className="text-zinc-300">{quote.clientName}</div>
                        {quote.clientEmail && (
                          <div className="text-xs text-zinc-500">{quote.clientEmail}</div>
                        )}
                      </td>

                      {/* Gültig bis */}
                      <td className="px-4 py-3">
                        <span className={expired ? "text-orange-400" : "text-zinc-400"}>
                          {fmtDate(quote.validUntil)}
                          {expired && " ⚠️"}
                        </span>
                      </td>

                      {/* Betrag */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {formatEur(quote.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>

                      {/* Aktionen */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* PDF ansehen */}
                          <Link
                            href={`/quotes/${quote.id}/pdf`}
                            title="PDF ansehen"
                            className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>

                          {/* Status-Änderungen */}
                          {quote.status === "draft" && (
                            <button
                              onClick={() => updateStatus(quote.id, "sent")}
                              disabled={actionLoading === quote.id + "sent"}
                              title="Als gesendet markieren"
                              className="p-1.5 rounded text-zinc-500 hover:text-blue-400 hover:bg-zinc-700 transition-colors"
                            >
                              {actionLoading === quote.id + "sent" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {quote.status === "sent" && (
                            <>
                              <button
                                onClick={() => updateStatus(quote.id, "accepted")}
                                disabled={!!actionLoading}
                                title="Als angenommen markieren"
                                className="p-1.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateStatus(quote.id, "declined")}
                                disabled={!!actionLoading}
                                title="Als abgelehnt markieren"
                                className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => sendReminder(quote.id)}
                                disabled={actionLoading === quote.id + "remind"}
                                title="Erinnerung senden"
                                className="p-1.5 rounded text-zinc-500 hover:text-yellow-400 hover:bg-zinc-700 transition-colors"
                              >
                                {actionLoading === quote.id + "remind" ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}

                          {/* In Rechnung umwandeln */}
                          {(quote.status === "accepted" || quote.status === "sent") && !quote.invoiceId && (
                            <button
                              onClick={() => convertToInvoice(quote.id)}
                              disabled={actionLoading === quote.id + "convert"}
                              title="In Rechnung umwandeln"
                              className="p-1.5 rounded text-zinc-500 hover:text-purple-400 hover:bg-zinc-700 transition-colors"
                            >
                              {actionLoading === quote.id + "convert" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Löschen */}
                          <button
                            onClick={() => deleteQuote(quote.id)}
                            disabled={actionLoading === quote.id + "delete"}
                            title="Löschen"
                            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                          >
                            {actionLoading === quote.id + "delete" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
