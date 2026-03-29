"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Calculator, FileText } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string; // lokale ID für React key
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 7 oder 19
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface InvoiceTemplateItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string | null;
  positions: InvoiceTemplateItem[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
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

function newItem(): InvoiceItem {
  return {
    id: Math.random().toString(36).slice(2),
    description: "",
    quantity: 1,
    unitPrice: 0,
    vatRate: 19,
  };
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function NewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [project, setProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(twoWeeks);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [description, setDescription] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(
    "Zahlbar innerhalb von 14 Tagen ohne Abzug."
  );
  const [bankDetails, setBankDetails] = useState(
    "Koch Aufforstung GmbH · IBAN: DE00 0000 0000 0000 0000 00 · BIC: XXXXXXXX"
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);

  // Daten laden
  const loadData = useCallback(async () => {
    try {
      const [projRes, numRes, templRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch("/api/invoices/next-number"),
        fetch("/api/invoice-templates"),
      ]);
      if (projRes.ok) setProject(await projRes.json());
      if (numRes.ok) {
        const { number } = await numRes.json();
        setInvoiceNumber(number);
      }
      if (templRes.ok) setTemplates(await templRes.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Vorlage anwenden
  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setItems(
      tpl.positions.map((pos) => ({
        id: Math.random().toString(36).slice(2),
        description: pos.description,
        quantity: pos.quantity,
        unitPrice: pos.unitPrice,
        vatRate: pos.vatRate,
      }))
    );
  }

  useEffect(() => { loadData(); }, [loadData]);

  // Items verwalten
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  // Speichern
  async function handleSave(status: "DRAFT" | "OPEN") {
    setSaving(true);
    setError(null);

    if (items.some((item) => !item.description.trim())) {
      setError("Alle Positionen müssen eine Beschreibung haben.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          number: invoiceNumber,
          description,
          status,
          invoiceDate,
          dueDate,
          clientName,
          clientAddress,
          paymentTerms,
          bankDetails,
          notes,
          items: items.map(({ description, quantity, unitPrice, vatRate }) => ({
            description,
            quantity,
            unitPrice,
            vatRate,
          })),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler beim Speichern");
        setSaving(false);
        return;
      }

      const invoice = await res.json();
      router.push(`/invoices/${invoice.id}/pdf`);
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Neue Rechnung" subtitle="Wird geladen…">
        <div className="p-6 flex items-center justify-center h-64 text-zinc-500">
          Lade Daten…
        </div>
      </AppShell>
    );
  }

  const totals = calcTotals(items);

  return (
    <AppShell title="Neue Rechnung" subtitle={project?.name ?? "Projekt"}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Navigation */}
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Link href={`/projects/${projectId}/finance`}
            className="flex items-center gap-1 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Projekt-Finanzen
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Neue Rechnung</span>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Rechnungskopf */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">📋 Rechnungsdaten</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rechnungsnummer *</label>
              <input
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rechnungsdatum *</label>
              <input
                type="date"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fälligkeitsdatum *</label>
              <input
                type="date"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Betreff / Beschreibung</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="z.B. Aufforstungsarbeiten Frühjahr 2026"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Kundenadresse */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">👤 Rechnungsempfänger</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name / Firma</label>
              <input
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Max Mustermann / Musterfirma GmbH"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Adresse</label>
              <textarea
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                placeholder={"Musterstraße 1\n12345 Musterstadt"}
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Rechnungspositionen */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">📊 Rechnungspositionen</h2>
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <select
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors"
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">Vorlage wählen…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500 hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Position hinzufügen
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="hidden md:grid md:grid-cols-[1fr_80px_110px_90px_100px_40px] gap-2 mb-2 px-1">
            <span className="text-xs text-zinc-500">Beschreibung</span>
            <span className="text-xs text-zinc-500 text-right">Menge</span>
            <span className="text-xs text-zinc-500 text-right">Einzelpreis</span>
            <span className="text-xs text-zinc-500 text-center">MwSt.</span>
            <span className="text-xs text-zinc-500 text-right">Summe (Netto)</span>
            <span />
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const { netto } = calcItem(item);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_80px_110px_90px_100px_40px] gap-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800"
                >
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Leistungsbeschreibung…"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-emerald-500 transition-colors pr-6"
                      placeholder="0,00"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                  </div>
                  <select
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    value={item.vatRate}
                    onChange={(e) => updateItem(item.id, "vatRate", parseInt(e.target.value))}
                  >
                    <option value={19}>19%</option>
                    <option value={7}>7%</option>
                    <option value={0}>0%</option>
                  </select>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono text-zinc-200">
                      {formatEur(netto)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summen */}
          <div className="mt-4 ml-auto w-full md:w-72 space-y-2">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Nettobetrag</span>
              <span className="font-mono">{formatEur(totals.netto)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-400">
              <span>MwSt.</span>
              <span className="font-mono">{formatEur(totals.mwst)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white border-t border-zinc-700 pt-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Gesamtbetrag
              </span>
              <span className="font-mono text-emerald-400">{formatEur(totals.brutto)}</span>
            </div>
          </div>
        </div>

        {/* Zahlungsbedingungen + Bank */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">🏦 Zahlungsinformationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Zahlungsbedingungen</label>
              <textarea
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Bankverbindung</label>
              <textarea
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Anmerkungen</label>
            <textarea
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="Optionale Anmerkungen zur Rechnung…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Link
            href={`/projects/${projectId}/finance`}
            className="px-5 py-2.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-center"
          >
            Abbrechen
          </Link>
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="px-5 py-2.5 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors disabled:opacity-50"
          >
            {saving ? "Wird gespeichert…" : "Als Entwurf speichern"}
          </button>
          <button
            onClick={() => handleSave("OPEN")}
            disabled={saving || totals.brutto === 0}
            className="px-5 py-2.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Wird gestellt…" : "🧾 Rechnung stellen"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
