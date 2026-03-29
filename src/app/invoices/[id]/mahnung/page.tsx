"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { Printer, ChevronLeft, AlertTriangle } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  position: number;
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
  status: string;
  invoiceDate: string;
  dueDate: string;
  dunningLevel: number;
  dunningDate: string | null;
  dunningFee: number;
  paidAt: string | null;
  paymentAmount: number | null;
  clientName: string | null;
  clientAddress: string | null;
  paymentTerms: string | null;
  bankDetails: string | null;
  notes: string | null;
  project: { id: string; name: string; color: string };
  items: InvoiceItem[];
  payments: Payment[];
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

const DUNNING_FEES: Record<number, number> = { 1: 5, 2: 10, 3: 25 };
const DUNNING_LABELS: Record<number, string> = {
  1: "1. Mahnung",
  2: "2. Mahnung",
  3: "3. Mahnung (Letzte Mahnung)",
};

// ─── Mahnungs-PDF-Seite ───────────────────────────────────────────────────────
export default function MahnungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvoice(data);
      })
      .catch(() => setError("Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Lade Mahnungsdaten…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-red-500">{error ?? "Rechnung nicht gefunden"}</p>
      </div>
    );
  }

  const dunningLevel = invoice.dunningLevel ?? 1;
  const dunningFeeForLevel = DUNNING_FEES[dunningLevel] ?? 5;
  const totalPaid = invoice.paymentAmount ?? 0;
  const ausstehend = invoice.amount - totalPaid;
  const gesamtMahnung = ausstehend + dunningFeeForLevel;

  // Neue Fälligkeitsfrist: 7 Tage ab heute
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + 7);

  return (
    <div className="min-h-screen bg-white">
      {/* Druck-Toolbar (wird nicht gedruckt) */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-10 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/invoices/${id}/pdf`}
            className="flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück zur Rechnung
          </Link>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            {DUNNING_LABELS[dunningLevel]} — {invoice.number}
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Mahnung drucken / als PDF speichern
        </button>
      </div>

      {/* Mahnungs-Dokument */}
      <div className="pt-16 print:pt-0">
        <div className="max-w-[794px] mx-auto p-12 print:p-0 print:max-w-none">

          {/* Absender-Zeile (oben links, für Fensterumschlag) */}
          <div className="mb-8">
            <p className="text-[9px] text-gray-400 mb-1">Koch Aufforstung GmbH · Musterstraße 1 · 12345 Musterstadt</p>
            {invoice.clientName && (
              <div className="text-sm text-gray-800 leading-relaxed">
                <p className="font-medium">{invoice.clientName}</p>
                {invoice.clientAddress && (
                  <p className="whitespace-pre-line text-gray-600">{invoice.clientAddress}</p>
                )}
              </div>
            )}
          </div>

          {/* Absender-Block rechts */}
          <div className="flex justify-between items-start mb-12">
            <div />
            <div className="text-right text-sm text-gray-600">
              <p className="font-bold text-gray-900 text-base">Koch Aufforstung GmbH</p>
              <p>Musterstraße 1</p>
              <p>12345 Musterstadt</p>
              <p className="mt-2">Tel: +49 (0) 123 456789</p>
              <p>info@kochaufforstung.de</p>
              <p className="mt-2 text-gray-500">Datum: {fmtDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Betreffzeile — Mahnung */}
          <div className="mb-8">
            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">
              {DUNNING_LABELS[dunningLevel]}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Mahnung zur Rechnung {invoice.number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Rechnungsdatum: {fmtDate(invoice.invoiceDate)} · Ursprüngliche Fälligkeit: {fmtDate(invoice.dueDate)}
            </p>
          </div>

          {/* Anschreiben */}
          <div className="mb-8 text-sm text-gray-700 leading-relaxed">
            <p className="mb-3">Sehr geehrte Damen und Herren,</p>
            <p className="mb-3">
              leider mussten wir feststellen, dass die oben genannte Rechnung trotz Ablauf der
              Zahlungsfrist bis heute noch nicht beglichen wurde.
              {dunningLevel > 1 && (
                <span>
                  {" "}Wir haben Sie bereits {dunningLevel - 1}× an diese offene Forderung erinnert.
                </span>
              )}
            </p>
            <p className="mb-3">
              Wir bitten Sie daher, den nachfolgend aufgeführten Betrag bis spätestens{" "}
              <strong>{fmtDate(newDueDate.toISOString())}</strong> auf das untenstehende Konto zu überweisen.
            </p>
            {dunningLevel === 3 && (
              <p className="mb-3 text-red-700 font-medium">
                Sollte der Betrag nicht bis zum genannten Datum eingehen, sehen wir uns gezwungen,
                einen Inkassodienstleister einzuschalten bzw. gerichtliche Schritte einzuleiten.
              </p>
            )}
          </div>

          {/* Forderungs-Übersicht */}
          <div className="mb-8 border border-amber-200 rounded-lg overflow-hidden">
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200">
              <h2 className="text-sm font-semibold text-amber-800">Offene Forderung</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-3 text-gray-600">Rechnungsbetrag ({invoice.number})</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatEur(invoice.amount)}</td>
                </tr>
                {totalPaid > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3 text-gray-600">Bereits bezahlter Betrag</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-600">− {formatEur(totalPaid)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-3 text-gray-600">Noch offener Betrag</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-900">{formatEur(ausstehend)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-3 text-amber-700">
                    Mahngebühr ({DUNNING_LABELS[dunningLevel]})
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-amber-700">{formatEur(dunningFeeForLevel)}</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="px-5 py-3 font-bold text-gray-900">Gesamtbetrag (zu überweisen)</td>
                  <td className="px-5 py-3 text-right font-bold font-mono text-lg text-amber-700">
                    {formatEur(gesamtMahnung)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Zahlungsinformationen */}
          {invoice.bankDetails && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Zahlungsinformationen
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.bankDetails}</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Verwendungszweck:{" "}
                  <span className="font-mono font-medium text-gray-700">
                    {invoice.number} – Mahnung {dunningLevel}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Bitte überweisen Sie bis spätestens{" "}
                  <strong>{fmtDate(newDueDate.toISOString())}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Zahlungsverlauf (wenn vorhanden) */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Bisherige Zahlungseingänge
              </h3>
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Datum</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Zahlungsart</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-500">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-700">{fmtDate(p.date)}</td>
                      <td className="px-4 py-2 text-gray-700">{p.method}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600">{formatEur(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Abschluss */}
          <div className="mt-8 text-sm text-gray-600 leading-relaxed">
            <p className="mb-3">
              Falls Sie die Zahlung bereits veranlasst haben, bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.
            </p>
            <p className="mb-6">Mit freundlichen Grüßen,</p>
            <p className="font-medium text-gray-800">Koch Aufforstung GmbH</p>
          </div>

          {/* Fußzeile */}
          <div className="mt-16 pt-4 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
            <span>Koch Aufforstung GmbH · Musterstraße 1 · 12345 Musterstadt</span>
            <span>Mahnung zur Rechnung {invoice.number} · {DUNNING_LABELS[dunningLevel]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
