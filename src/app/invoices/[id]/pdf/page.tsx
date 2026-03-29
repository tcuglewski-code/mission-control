"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { Printer, ChevronLeft } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  position: number;
}

interface Invoice {
  id: string;
  number: string;
  description: string | null;
  amount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
  clientName: string | null;
  clientAddress: string | null;
  paymentTerms: string | null;
  bankDetails: string | null;
  notes: string | null;
  project: { id: string; name: string; color: string };
  items: InvoiceItem[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calcItem(item: InvoiceItem) {
  const netto = item.quantity * item.unitPrice;
  const mwst = netto * (item.vatRate / 100);
  return { netto, mwst, brutto: netto + mwst };
}

function calcTotals(items: InvoiceItem[]) {
  return items.reduce(
    (acc, item) => {
      const { netto, mwst, brutto } = calcItem(item);
      return { netto: acc.netto + netto, mwst: acc.mwst + mwst, brutto: acc.brutto + brutto };
    },
    { netto: 0, mwst: 0, brutto: 0 }
  );
}

// Gruppiert MwSt-Summen nach Steuersatz
function groupVat(items: InvoiceItem[]): { rate: number; netto: number; mwst: number }[] {
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
    body {
      background: white !important;
      color: #1a1a1a !important;
    }
    .no-print {
      display: none !important;
    }
    @page {
      size: A4;
      margin: 15mm 20mm;
    }
  }
`;

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function InvoicePDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Nicht gefunden");
        return r.json();
      })
      .then(setInvoice)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Lade Rechnung…
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-red-400">
        Rechnung nicht gefunden.
      </div>
    );
  }

  const totals = invoice.items.length > 0
    ? calcTotals(invoice.items)
    : { netto: invoice.amount / 1.19, mwst: invoice.amount - invoice.amount / 1.19, brutto: invoice.amount };

  const vatGroups = invoice.items.length > 0 ? groupVat(invoice.items) : [];
  const hasItems = invoice.items.length > 0;

  const statusLabel: Record<string, string> = {
    OPEN: "Offen",
    PAID: "Bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
    DRAFT: "Entwurf",
  };

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Toolbar (nur auf Screen) */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <Link
          href={`/projects/${invoice.project.id}/finance`}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{invoice.number}</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Drucken / PDF
          </button>
        </div>
      </div>

      {/* A4-Rechnungslayout */}
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
          {/* ─── Kopfzeile ──────────────────────────────────────────────── */}
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

            {/* Rechts: Rechnungsdetails + Status */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block",
                background: invoice.status === "PAID" ? "#dcfce7" : invoice.status === "OVERDUE" ? "#fee2e2" : "#dbeafe",
                color: invoice.status === "PAID" ? "#166534" : invoice.status === "OVERDUE" ? "#991b1b" : "#1e3a8a",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "9pt",
                fontWeight: "bold",
                marginBottom: "4mm",
              }}>
                {statusLabel[invoice.status] ?? invoice.status}
              </div>
              <div style={{ color: "#555", lineHeight: 1.8, fontSize: "9pt" }}>
                <strong style={{ color: "#1a1a1a" }}>RECHNUNG</strong><br />
                Nr: <strong>{invoice.number}</strong><br />
                Datum: {fmtDate(invoice.invoiceDate)}<br />
                Fällig: {fmtDate(invoice.dueDate)}<br />
                {invoice.paidAt && <>Bezahlt: {fmtDate(invoice.paidAt)}</>}
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <div style={{ borderTop: "2px solid #166534", marginBottom: "8mm" }} />

          {/* ─── Empfänger ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: "8mm" }}>
            <div style={{ fontSize: "7pt", color: "#999", marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Rechnungsempfänger
            </div>
            <div style={{ fontSize: "10pt", lineHeight: 1.7 }}>
              <strong>{invoice.clientName || invoice.project.name}</strong>
              {invoice.clientAddress && (
                <>
                  <br />
                  {invoice.clientAddress.split("\n").map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ─── Betreff ───────────────────────────────────────────────── */}
          {invoice.description && (
            <div style={{ marginBottom: "8mm" }}>
              <strong>Betreff:</strong> {invoice.description}
            </div>
          )}

          {/* ─── Positionstabelle ──────────────────────────────────────── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0fdf4", borderBottom: "2px solid #166534" }}>
                <th style={{ padding: "3mm 4mm", textAlign: "left", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  Pos.
                </th>
                <th style={{ padding: "3mm 4mm", textAlign: "left", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  Beschreibung
                </th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  Menge
                </th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  Einzelpreis
                </th>
                <th style={{ padding: "3mm 4mm", textAlign: "center", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  MwSt.
                </th>
                <th style={{ padding: "3mm 4mm", textAlign: "right", fontSize: "9pt", color: "#166534", fontWeight: "bold" }}>
                  Netto
                </th>
              </tr>
            </thead>
            <tbody>
              {hasItems ? (
                invoice.items.map((item, idx) => {
                  const { netto } = calcItem(item);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: idx % 2 === 0 ? "white" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", color: "#666", verticalAlign: "top" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "3mm 4mm", fontSize: "9pt", verticalAlign: "top" }}>
                        {item.description}
                      </td>
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
                    {invoice.description || "Leistungen gemäß Vereinbarung"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ─── Summenblock ───────────────────────────────────────────── */}
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
                <span style={{ fontSize: "11pt", fontWeight: "bold", color: "white" }}>Gesamtbetrag</span>
                <span style={{ fontSize: "11pt", fontWeight: "bold", color: "white", fontFamily: "monospace" }}>
                  {formatEur(totals.brutto)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Zahlungsbedingungen + Bank ────────────────────────────── */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "6mm", display: "flex", gap: "10mm" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold", color: "#166534", marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Zahlungsbedingungen
              </div>
              <div style={{ fontSize: "9pt", color: "#555", lineHeight: 1.6 }}>
                {invoice.paymentTerms || "Zahlbar innerhalb von 14 Tagen ohne Abzug."}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold", color: "#166534", marginBottom: "2mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Bankverbindung
              </div>
              <div style={{ fontSize: "9pt", color: "#555", lineHeight: 1.6 }}>
                {invoice.bankDetails?.split("·").map((part, i) => (
                  <span key={i}>{part.trim()}{i < (invoice.bankDetails?.split("·").length ?? 0) - 1 ? <br /> : ""}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Anmerkungen ───────────────────────────────────────────── */}
          {invoice.notes && (
            <div style={{ marginTop: "6mm", padding: "4mm", backgroundColor: "#f9fafb", borderLeft: "3px solid #166534", fontSize: "9pt", color: "#555", lineHeight: 1.6 }}>
              <strong>Anmerkungen:</strong> {invoice.notes}
            </div>
          )}

          {/* ─── Footer ────────────────────────────────────────────────── */}
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
