"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Plus, Trash2, Edit2, Check, X, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface Position {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string | null;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function calcTotal(positions: Position[]): number {
  return positions.reduce((sum, p) => {
    const netto = p.quantity * p.unitPrice;
    return sum + netto + netto * (p.vatRate / 100);
  }, 0);
}

// ─── Positions-Tabelle ────────────────────────────────────────────────────────
function PositionTable({
  positions,
  onChange,
}: {
  positions: Position[];
  onChange: (pos: Position[]) => void;
}) {
  function update(idx: number, field: keyof Position, value: string | number) {
    const updated = positions.map((p, i) =>
      i === idx ? { ...p, [field]: field === "description" ? value : Number(value) } : p
    );
    onChange(updated);
  }

  function addRow() {
    onChange([...positions, { description: "", quantity: 1, unitPrice: 0, vatRate: 19 }]);
  }

  function removeRow(idx: number) {
    onChange(positions.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800">
              <th className="px-3 py-2 text-left text-xs text-zinc-400 font-medium">Beschreibung</th>
              <th className="px-3 py-2 text-right text-xs text-zinc-400 font-medium w-16">Menge</th>
              <th className="px-3 py-2 text-right text-xs text-zinc-400 font-medium w-28">Einzelpreis</th>
              <th className="px-3 py-2 text-right text-xs text-zinc-400 font-medium w-16">MwSt.</th>
              <th className="px-3 py-2 text-right text-xs text-zinc-400 font-medium w-28">Gesamt</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {positions.map((pos, idx) => {
              const netto = pos.quantity * pos.unitPrice;
              const brutto = netto + netto * (pos.vatRate / 100);
              return (
                <tr key={idx} className="bg-zinc-900">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full bg-transparent text-zinc-200 focus:outline-none"
                      value={pos.description}
                      onChange={(e) => update(idx, "description", e.target.value)}
                      placeholder="Leistungsbeschreibung…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                      value={pos.quantity}
                      onChange={(e) => update(idx, "quantity", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                      value={pos.unitPrice}
                      onChange={(e) => update(idx, "unitPrice", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                      value={pos.vatRate}
                      onChange={(e) => update(idx, "vatRate", e.target.value)}
                    >
                      <option value={0}>0%</option>
                      <option value={7}>7%</option>
                      <option value={19}>19%</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatEur(brutto)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Position hinzufügen
      </button>
    </div>
  );
}

// ─── Template-Karte ───────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onDeleted,
  onUpdated,
}: {
  template: InvoiceTemplate;
  onDeleted: () => void;
  onUpdated: (t: InvoiceTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [positions, setPositions] = useState<Position[]>(template.positions);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/invoice-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, positions }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Vorlage "${template.name}" löschen?`)) return;
    setDeleting(true);
    await fetch(`/api/invoice-templates/${template.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div className="bg-[#18181b] border border-zinc-800 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        onClick={() => !editing && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-zinc-500" />
          {editing ? (
            <input
              type="text"
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-200">{template.name}</p>
              {template.description && (
                <p className="text-xs text-zinc-500">{template.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">
            {template.positions.length} Position(en) · {formatEur(calcTotal(template.positions))}
          </span>
          {editing ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(false); }}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
          {editing && (
            <div className="mb-3">
              <label className="block text-xs text-zinc-400 mb-1">Beschreibung</label>
              <input
                type="text"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung der Vorlage…"
              />
            </div>
          )}
          {editing ? (
            <PositionTable positions={positions} onChange={setPositions} />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="pb-2 text-left text-zinc-500">Beschreibung</th>
                  <th className="pb-2 text-right text-zinc-500">Menge</th>
                  <th className="pb-2 text-right text-zinc-500">Einzelpreis</th>
                  <th className="pb-2 text-right text-zinc-500">MwSt.</th>
                  <th className="pb-2 text-right text-zinc-500">Gesamt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {template.positions.map((pos, idx) => {
                  const netto = pos.quantity * pos.unitPrice;
                  const brutto = netto + netto * (pos.vatRate / 100);
                  return (
                    <tr key={idx}>
                      <td className="py-1.5 text-zinc-300">{pos.description}</td>
                      <td className="py-1.5 text-right text-zinc-400">{pos.quantity}</td>
                      <td className="py-1.5 text-right text-zinc-400 font-mono">{formatEur(pos.unitPrice)}</td>
                      <td className="py-1.5 text-right text-zinc-400">{pos.vatRate}%</td>
                      <td className="py-1.5 text-right font-mono text-zinc-200">{formatEur(brutto)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-700">
                  <td colSpan={4} className="pt-2 text-right text-zinc-400 font-medium">Gesamt (Brutto)</td>
                  <td className="pt-2 text-right font-mono font-semibold text-emerald-400">
                    {formatEur(calcTotal(template.positions))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Neue Vorlage Formular ────────────────────────────────────────────────────
function NewTemplateForm({ onCreated }: { onCreated: (t: InvoiceTemplate) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<Position[]>([
    { description: "", quantity: 1, unitPrice: 0, vatRate: 19 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError("Name ist erforderlich"); return; }
    const valid = positions.filter((p) => p.description.trim());
    if (valid.length === 0) { setError("Mindestens eine Position mit Beschreibung erforderlich"); return; }

    setSaving(true);
    setError(null);
    const res = await fetch("/api/invoice-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description || undefined, positions: valid }),
    });
    if (res.ok) {
      const created = await res.json();
      onCreated(created);
      setName("");
      setDescription("");
      setPositions([{ description: "", quantity: 1, unitPrice: 0, vatRate: 19 }]);
      setOpen(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Fehler");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Neue Vorlage
      </button>
    );
  }

  return (
    <div className="bg-[#18181b] border border-zinc-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Neue Rechnungsvorlage</h3>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Name *</label>
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Aufforstung Standard"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Beschreibung</label>
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung…"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-2">Positionen</label>
        <PositionTable positions={positions} onChange={setPositions} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Vorlage erstellen"}
        </button>
      </div>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────
export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/invoice-templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell title="Rechnungsvorlagen" subtitle="Häufige Positionen als Vorlagen speichern">
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              {templates.length} Vorlage{templates.length !== 1 ? "n" : ""} gespeichert
            </p>
          </div>
          <NewTemplateForm
            onCreated={(t) => setTemplates((prev) => [t, ...prev])}
          />
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
            Lade Vorlagen…
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm gap-3">
            <FileText className="w-10 h-10 text-zinc-700" />
            <p>Noch keine Vorlagen erstellt.</p>
            <p className="text-xs text-zinc-600">
              Erstelle Vorlagen für häufig verwendete Rechnungspositionen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onDeleted={() => setTemplates((prev) => prev.filter((x) => x.id !== t.id))}
                onUpdated={(updated) =>
                  setTemplates((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
