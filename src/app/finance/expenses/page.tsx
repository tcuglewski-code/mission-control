"use client"

/**
 * /finance/expenses — Betriebsausgaben verwalten
 * Sprint AF069 | Mission Control
 *
 * Manuelle Eingabe von Ausgaben für:
 * - Vercel, Neon, Expo, Anthropic (SaaS)
 * - Hosting, Marketing, Personal, Tools
 * - Wiederkehrende vs. einmalige Kosten
 */

import { useEffect, useState, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import Link from "next/link"
import { Plus, Pencil, Trash2, X, RefreshCw, TrendingDown, Building2, Calendar } from "lucide-react"

interface Expense {
  id: string
  title: string
  description?: string
  amount: number
  category: string
  vendor?: string
  date: string
  recurring: boolean
  projectId?: string
  notes?: string
  createdAt: string
}

interface ExpenseData {
  expenses: Expense[]
  pagination: { page: number; limit: number; total: number; pages: number }
  summary: {
    totalAmount: number
    recurringMonthly: number
    byCategory: { category: string; total: number; count: number }[]
  }
  categories: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Hosting: "bg-blue-100 text-blue-700",
  SaaS: "bg-purple-100 text-purple-700",
  Personal: "bg-green-100 text-green-700",
  Marketing: "bg-orange-100 text-orange-700",
  Tools: "bg-cyan-100 text-cyan-700",
  Sonstiges: "bg-gray-100 text-gray-700",
}

const VENDOR_SUGGESTIONS = [
  "Vercel",
  "Neon",
  "Anthropic",
  "OpenAI",
  "Expo",
  "Hostinger",
  "GitHub",
  "Stripe",
  "Google Cloud",
  "AWS",
  "Cloudflare",
  "Sentry",
]

function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

interface ExpenseFormProps {
  expense?: Expense | null
  categories: string[]
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

function ExpenseForm({ expense, categories, onSave, onCancel }: ExpenseFormProps) {
  const [form, setForm] = useState({
    title: expense?.title || "",
    description: expense?.description || "",
    amount: expense?.amount?.toString() || "",
    category: expense?.category || "SaaS",
    vendor: expense?.vendor || "",
    date: expense?.date ? expense.date.split("T")[0] : new Date().toISOString().split("T")[0],
    recurring: expense?.recurring || false,
    notes: expense?.notes || "",
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...form,
        amount: parseFloat(form.amount),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">
          {expense ? "Ausgabe bearbeiten" : "Neue Ausgabe"}
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Titel */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Titel *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="z.B. Vercel Pro Subscription"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Betrag */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Betrag (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="20.00"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Kategorie */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Kategorie</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Anbieter */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Anbieter</label>
          <input
            type="text"
            list="vendors"
            value={form.vendor}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            placeholder="z.B. Vercel"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="vendors">
            {VENDOR_SUGGESTIONS.map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>

        {/* Datum */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Datum</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Wiederkehrend */}
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="recurring"
            checked={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="recurring" className="text-sm text-gray-600">
            Monatlich wiederkehrend
          </label>
        </div>
      </div>

      {/* Notizen */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">Notizen</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Zusätzliche Informationen..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Speichern..." : expense ? "Aktualisieren" : "Hinzufügen"}
        </button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [filter, setFilter] = useState({ category: "", months: 12 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("months", filter.months.toString())
      if (filter.category) params.set("category", filter.category)

      const res = await fetch(`/api/finance/expenses?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (formData: any) => {
    const url = editingExpense
      ? `/api/finance/expenses/${editingExpense.id}`
      : "/api/finance/expenses"
    const method = editingExpense ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Fehler")
    }

    setShowForm(false)
    setEditingExpense(null)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Ausgabe wirklich löschen?")) return

    const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Fehler beim Löschen")
      return
    }
    fetchData()
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/finance" className="hover:text-gray-700">Finanzen</Link>
              <span>›</span>
              <Link href="/finance/cashflow" className="hover:text-gray-700">Cash Flow</Link>
              <span>›</span>
              <span>Ausgaben</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">📊 Betriebsausgaben</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Alle Kategorien</option>
              {data?.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filter.months}
              onChange={(e) => setFilter({ ...filter, months: parseInt(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value={3}>3 Monate</option>
              <option value={6}>6 Monate</option>
              <option value={12}>12 Monate</option>
            </select>
            <button
              onClick={() => { setShowForm(true); setEditingExpense(null) }}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus size={16} /> Ausgabe
            </button>
          </div>
        </div>

        {/* Form */}
        {(showForm || editingExpense) && data && (
          <ExpenseForm
            expense={editingExpense}
            categories={data.categories}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingExpense(null) }}
          />
        )}

        {loading && <div className="text-center py-12 text-gray-400">Lade Ausgaben...</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <TrendingDown size={14} />
                  Gesamt
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {formatEur(data.summary.totalAmount)}
                </div>
                <div className="text-xs text-gray-400">
                  {data.pagination.total} Einträge
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <RefreshCw size={14} />
                  Wiederkehrend
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {formatEur(data.summary.recurringMonthly)}
                </div>
                <div className="text-xs text-gray-400">/ Monat</div>
              </div>
              {data.summary.byCategory.slice(0, 2).map((cat) => (
                <div key={cat.category} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Building2 size={14} />
                    {cat.category}
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatEur(cat.total)}
                  </div>
                  <div className="text-xs text-gray-400">{cat.count} Einträge</div>
                </div>
              ))}
            </div>

            {/* Expense List */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Ausgabe</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Kategorie</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Anbieter</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Betrag</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Datum</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        Keine Ausgaben vorhanden. Klicke auf "+ Ausgabe" um zu starten.
                      </td>
                    </tr>
                  )}
                  {data.expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{exp.title}</div>
                        {exp.recurring && (
                          <span className="text-xs text-purple-500 flex items-center gap-1">
                            <RefreshCw size={10} /> monatlich
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Sonstiges}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {exp.vendor || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">
                        -{formatEur(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 flex items-center gap-1 justify-end">
                        <Calendar size={12} />
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingExpense(exp); setShowForm(true) }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Bearbeiten"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Links */}
            <div className="flex justify-center gap-4">
              <Link href="/finance/cashflow" className="text-sm text-blue-600 hover:underline">
                ← Zurück zu Cash Flow
              </Link>
              <Link href="/ai-usage" className="text-sm text-blue-600 hover:underline">
                KI-Kosten anzeigen →
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
