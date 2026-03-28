"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Calculator, FileText, Loader2 } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
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

function newItem(): QuoteItem {
  return {
    id: Math.random().toString(36).slice(2),
    description: "",
    quantity: 1,
    unitPrice: 0,
    vatRate: 19,
  };
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-State
  const [quoteNumber, setQuoteNumber] = useState("");
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState(thirtyDays);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([newItem()]);

  // Daten laden
  useEffect(() => {
    async function load() {
      try {
        const [projRes, numRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/quotes/next-number"),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (numRes.ok) {
          const { number } = await numRes.json();
          setQuoteNumber(number);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Item-Aktionen
  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: field === "description" ? value : Number(value) } : i))
    );

  const totals = calcTotals(items);

  // Speichern
  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const validItems = items.filter((i) => i.description.trim() && i.unitPrice > 0);
      const r = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: quoteNumber,
          projectId: projectId || null,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || null,
          title: title.trim(),
          items: validItems.map(({ description, quantity, unitPrice, vatRate }) => ({
            description,
            quantity,
            unitPrice,
            vatRate,
          })),
          validUntil,
          status: asDraft ? "draft" : "draft",
          note: note.trim() || null,
        }),
      });

      if (!r.ok) {
        const data = await r.json();
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }

      const quote = await r.json();
      router.push(`/quotes/${quote.id}/pdf`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Neues Angebot">
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Lade…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Neues Angebot">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/quotes" className="text-zinc-500 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Neues Angebot</h1>
            <p className="text-zinc-500 text-sm">{quoteNumber}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/50 text-red-300 border border-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Angebots-Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Angebotsdaten</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Angebotsnummer */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Angebotsnummer *</label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Projekt (optional) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Projekt (optional)</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">– Kein Projekt –</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Titel */}
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1.5">Angebotstitel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="z.B. Aufforstung Waldstück Nord 2026"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Gültig bis */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Gültig bis *</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Erstellt am */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Erstellt am</label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString("de-DE")}
                  readOnly
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Kundendaten */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Kunde</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Name / Firma *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Max Mustermann"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">E-Mail (für Erinnerungen)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="kunde@example.de"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Positionen */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Positionen</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Position hinzufügen
              </button>
            </div>

            {/* Tabellenkopf */}
            <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2 px-1">
              <div className="col-span-5">Beschreibung</div>
              <div className="col-span-2 text-right">Menge</div>
              <div className="col-span-2 text-right">Einzelpreis</div>
              <div className="col-span-2 text-right">MwSt.</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const { brutto } = calcItem(item);
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Leistungsbeschreibung"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 text-right font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.vatRate}
                        onChange={(e) => updateItem(item.id, "vatRate", e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value={19}>19%</option>
                        <option value={7}>7%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <span className="text-xs text-zinc-500 font-mono hidden lg:block">
                        {formatEur(brutto)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summen */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Netto</span>
                  <span className="font-mono">{formatEur(totals.netto)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>MwSt.</span>
                  <span className="font-mono">{formatEur(totals.mwst)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white border-t border-zinc-700 pt-2 mt-2">
                  <span>Gesamt (Brutto)</span>
                  <span className="font-mono">{formatEur(totals.brutto)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Anmerkungen</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optionale Hinweise, Bedingungen oder Anmerkungen zum Angebot…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/quotes"
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Abbrechen
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Angebot erstellen & PDF
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
