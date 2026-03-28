"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ChevronLeft, Send, CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react";

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

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calcItem(item: QuoteItem) {
  const netto = item.quantity * item.unitPrice;
  const mwst = netto * (item.vatRate / 100);
  return { netto, mwst, brutto: netto + mwst };
}

function calcTotals(items: QuoteItem[]) {
  return items.reduce(
    (acc, item) => {
      const { netto, mwst, brutto } = calcItem(item);
      return { netto: acc.netto + netto, mwst: acc.mwst + mwst, brutto: acc.brutto + brutto };
    },
    { netto: 0, mwst: 0, brutto: 0 }
  );
}

function groupVat(items: QuoteItem[]): { rate: number; netto: number; mwst: number }[] {
  const map: Record<number, { netto: number; mwst: number }> = {};
  for (const item of items) {
    const { netto, mwst } = calcItem(item);
    if (!map[item.vatRate]) map[item.vatRate] = { netto: 0, mwst: 0 };
    map[item.vatRate].netto += netto;
    map[item.vatRate].mwst += mwst;
  }
  return Object.entries(map)
    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
    .sort((a, b) => b.rate - a.rate);
}

// ─── Print CSS ────────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    body { background: white !important; color: #1a1a1a !important; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 15mm 20mm; }
  }
`;

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  accepted: "Angenommen",
  declined: "Abgelehnt",
  expired: "Abgelaufen",
  invoiced: "In Rechnung",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#3f3f46", color: "#a1a1aa" },
  sent: { bg: "#1e3a8a", color: "#93c5fd" },
  accepted: { bg: "#14532d", color: "#86efac" },
  declined: { bg: "#7f1d1d", color: "#fca5a5" },
  expired: { bg: "#7c2d12", color: "#fdba74" },
  invoiced: { bg: "#3b0764", color: "#c4b5fd" },
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function QuotePDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Nicht gefunden");
        return r.json();
      })
      .then(setQuote)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const updateStatus = async (status: string) => {
    if (!quote) return;
    setActionLoading(status);
    try {
      const r = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        setQuote((prev) => prev ? { ...prev, status } : prev);
        showToast("Status aktualisiert");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const convertToInvoice = async () => {
    if (!quote) return;
    setActionLoading("convert");
    try {
      const r = await fetch(`/api/quotes/${id}/convert`, { method: "POST" });
      const data = await r.json();
      if (r.ok) {
        showToast(`✅ Rechnung ${data.invoice.number} erstellt!`);
        setQuote((prev) => prev ? { ...prev, status: "invoiced", invoiceId: data.invoice.id } : prev);
      } else {
        showToast(`❌ ${data.error}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Lade Angebot…
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-red-400">
        Angebot nicht gefunden.
      </div>
    );
  }

  const items = Array.isArray(quote.items) ? (quote.items as QuoteItem[]) : [];
  const totals = items.length > 0
    ? calcTotals(items)
    : { netto: quote.amount / 1.19, mwst: quote.amount - quote.amount / 1.19, brutto: quote.amount };
  const vatGroups = items.length > 0 ? groupVat(items) : [];
  const statusColors = STATUS_COLORS[quote.status] ?? { bg: "#3f3f46", color: "#a1a1aa" };
  const isExpired = new Date(quote.validUntil) < new Date() && !["accepted", "declined", "invoiced"].includes(quote.status);

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Toast */}
      {toast && (
        <div className="no-print fixed top-20 right-6 z-50 bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <Link
          href="/quotes"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">{quote.number}</span>

          {/* Status-Aktionen */}
          {quote.status === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-700 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
            >
              {actionLoading === "sent" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Als gesendet markieren
            </button>
          )}
          {quote.status === "sent" && (
            <>
              <button
                onClick={() => updateStatus("accepted")}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
              >
                {actionLoading === "accepted" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Angenommen
              </button>
              <button
                onClick={() => updateStatus("declined")}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {actionLoading === "declined" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Abgelehnt
              </button>
            </>
          )}
          {(quote.status === "accepted" || quote.status === "sent") && !quote.invoiceId && (
            <button
              onClick={convertToInvoice}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
            >
              {actionLoading === "convert" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              In Rechnung umwandeln
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Drucken / PDF
          </button>
        </div>
      </div>

      {/* A4-Layout */}
      <div
        className="min-h-screen bg-zinc-100 py-12 px-4 print:bg-white print:py-0 print:px-0"
        style={{ paddingTop: "4rem" }}
      >
        <div
          className="bg-white mx-auto shadow-xl print:shadow-none"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "20mm",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "10pt",
            color: "#1a1a1a",
          }}
        >
          {/* ─── Kopfzeile ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12mm" }}>
            {/* Links: Absender */}
            <div>
              <div style={{ fontSize: "18pt", fontWeight: "bold", color: "#166534", marginBottom: "2mm" }}>
                Koch Aufforstung GmbH
              </div>
              <div style={{ color: "#555", lineHeight: 1.6, fontSize: "9pt" }}>
                Musterstraße 1<br />
                12345 Musterstadt<br />
                Tel: +49 (0) 123 456789<br />
                info@koch-aufforstung.de<br />
                www.koch-aufforstung.de
              </div>
            </div>

            {/* Rechts: Angebotsdetails + Status */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block",
                background: statusColors.bg,
                color: statusColors.color,
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "9pt",
                fontWeight: "bold",
                marginBottom: "4mm",
              }}>
                {STATUS_LABELS[quote.status] ?? quote.status}
              </div>
              <div style={{ color: "#555", lineHeight: 1.8, fontSize: "9pt" }}>
                <strong style={{ color: "#1a1a1a" }}>ANGEBOT</strong><br />
                Nr: <strong>{quote.number}</strong><br />
                Datum: {fmtDate(quote.createdAt)}<br />
                <span style={{ color: isExpired ? "#ea580c" : "#555" }}>
                  Gültig bis: <strong>{fmtDate(quote.validUntil)}</strong>
                  {isExpired && " ⚠️"}
                </span>
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <div style={{ borderTop: "2px solid #166534", marginBottom: "8mm" }} />

          {/* ─── Empfänger ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "8mm" }}>
            <div style={{ fontSize: "7pt", color: "#999", marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Angebotsempfänger
            </div>
            <div style={{ fontSize: "10pt", lineHeight: 1.7 }}>
              <strong>{quote.clientName}</strong>
              {quote.clientEmail && (
                <>
                  <br />
                  <span style={{ color: "#555", fontSize: "9pt" }}>{quote.clientEmail}</span>
                </>
              )}
            </div>
          </div>

          {/* ─── Betreff ────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "8mm" }}>
            <strong>Betreff:</strong> {quote.title}
          </div>

          {/* ─── Anschreiben ────────────────────────────────────────────────── */}
          <div style={{ marginBottom: "6mm", fontSize: "10pt", lineHeight: 1.6 }}>
            sehr geehrte Damen und Herren,<br /><br />
            wir freuen uns, Ihnen folgendes Angebot zu unterbreiten:
          </div>

          {/* ─── Positionstabelle ───────────────────────────────────────────── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0fdf4", borderBottom: "2px solid #166534" }}>
                <th style={{ padding: "3mm 4mm", textAlign: "left", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>Pos.</th>
                <th style={{ padding: "3mm 4mm", textAlign: "left", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>Beschreibung</th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>Menge</th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>Einzelpreis</th>
                <th style={{ padding: "3mm 4mm", textAlign: "center", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>MwSt.</th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>Netto</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const { netto } = calcItem(item);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", color: "#666", verticalAlign: "top" }}>{idx + 1}</td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", verticalAlign: "top" }}>{item.description}</td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", textAlign: "right", verticalAlign: "top" }}>
                        {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
                      </td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", textAlign: "right", verticalAlign: "top", fontFamily: "monospace" }}>
                        {formatEur(item.unitPrice)}
                      </td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", textAlign: "center", verticalAlign: "top" }}>
                        {item.vatRate}%
                      </td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", textAlign: "right", verticalAlign: "top", fontFamily: "monospace" }}>
                        {formatEur(netto)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "4mm", fontSize: "9pt", color: "#666", fontStyle: "italic" }}>
                    Leistungen gemäß Vereinbarung
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ─── Summenblock ────────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8mm" }}>
            <div style={{ width: "70mm" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2mm 0", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "9pt", color: "#555" }}>Nettobetrag</span>
                <span style={{ fontSize: "9pt", fontFamily: "monospace" }}>{formatEur(totals.netto)}</span>
              </div>
              {vatGroups.map((vg) => (
                <div key={vg.rate} style={{ display: "flex", justifyContent: "space-between", padding: "2mm 0", borderBottom: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: "9pt", color: "#555" }}>MwSt. {vg.rate}%</span>
                  <span style={{ fontSize: "9pt", fontFamily: "monospace" }}>{formatEur(vg.mwst)}</span>
                </div>
              ))}
              {vatGroups.length === 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2mm 0", borderBottom: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: "9pt", color: "#555" }}>MwSt. 19%</span>
                  <span style={{ fontSize: "9pt", fontFamily: "monospace" }}>{formatEur(totals.mwst)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3mm 4mm", backgroundColor: "#166534", borderRadius: "4px", marginTop: "2mm" }}>
                <span style={{ fontSize: "11pt", fontWeight: "bold", color: "white" }}>Angebotssumme</span>
                <span style={{ fontSize: "11pt", fontWeight: "bold", color: "white", fontFamily: "monospace" }}>
                  {formatEur(totals.brutto)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Gültigkeitshinweis ─────────────────────────────────────────── */}
          <div style={{ marginBottom: "6mm", padding: "4mm", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px" }}>
            <div style={{ fontSize: "9pt", color: "#166534", lineHeight: 1.6 }}>
              <strong>Gültigkeitsdatum:</strong> Dieses Angebot ist gültig bis zum{" "}
              <strong>{fmtDate(quote.validUntil)}</strong>.
              Nach Ablauf dieser Frist behalten wir uns Preisanpassungen vor.
            </div>
          </div>

          {/* ─── Anmerkungen ────────────────────────────────────────────────── */}
          {quote.note && (
            <div style={{ marginBottom: "6mm", padding: "4mm", backgroundColor: "#f9fafb", borderLeft: "3px solid #166534", fontSize: "9pt", color: "#555", lineHeight: 1.6 }}>
              <strong>Anmerkungen:</strong> {quote.note}
            </div>
          )}

          {/* ─── Schlussformulierung ────────────────────────────────────────── */}
          <div style={{ marginBottom: "10mm", fontSize: "10pt", lineHeight: 1.6, color: "#555" }}>
            Bei Fragen stehen wir Ihnen gerne zur Verfügung. Wir würden uns freuen,
            Sie als Kunden begrüßen zu dürfen und verbleiben mit freundlichen Grüßen,<br /><br />
            <strong style={{ color: "#1a1a1a" }}>Koch Aufforstung GmbH</strong>
          </div>

          {/* ─── Footer ─────────────────────────────────────────────────────── */}
          <div style={{ marginTop: "12mm", borderTop: "1px solid #e5e7eb", paddingTop: "4mm", textAlign: "center", fontSize: "7.5pt", color: "#999" }}>
            Koch Aufforstung GmbH · Musterstraße 1 · 12345 Musterstadt ·
            Steuernummer: 00/000/00000 · Geschäftsführer: Max Koch ·
            Amtsgericht Musterstadt HRB 00000
          </div>
        </div>
      </div>
    </>
  );
}
