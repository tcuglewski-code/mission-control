"use client"

/**
 * /finance/cashflow — Cash Flow Dashboard
 * Sprint JQ | Mission Control
 *
 * Zeigt:
 * - KPI-Karten: MRR, ARR, Burn Rate, Runway, Balance
 * - Monatlicher Cashflow-Chart (CSS-basiert, kein Recharts benötigt)
 * - Offene Forderungen
 * - 3-Monats-Prognose
 */

import { useEffect, useState, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import Link from "next/link"
import { TrendingUp, TrendingDown, DollarSign, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface CashflowKpis {
  mrr: number
  arr: number
  burnRate: number
  runway: number | null
  currentBalance: number
  openReceivables: number
  openInvoiceCount: number
  overdueReceivables: number
  currentMonthCashIn: number
  currentMonthCashOut: number
}

interface TimelineEntry {
  month: string
  label: string
  cashIn: number
  cashOut: number
  net: number
  balance: number
  invoices?: number
  isForecast?: boolean
}

interface CashflowData {
  kpis: CashflowKpis
  timeline: TimelineEntry[]
  forecast: TimelineEntry[]
  generatedAt: string
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount)
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "gray",
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  color?: "green" | "red" | "blue" | "orange" | "gray"
}) {
  const colorClasses = {
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    gray: "bg-gray-50 text-gray-700 border-gray-100",
  }
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium opacity-75">{title}</span>
        <span className="opacity-50 text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
      {trend && (
        <div className="mt-1">
          {trend === "up" && <span className="text-xs text-green-600 flex items-center gap-1"><ArrowUpRight size={12} /> positiv</span>}
          {trend === "down" && <span className="text-xs text-red-600 flex items-center gap-1"><ArrowDownRight size={12} /> negativ</span>}
        </div>
      )}
    </div>
  )
}

function CashflowBar({
  entry,
  maxValue,
}: {
  entry: TimelineEntry
  maxValue: number
}) {
  const inHeight = maxValue > 0 ? (entry.cashIn / maxValue) * 100 : 0
  const outHeight = maxValue > 0 ? (entry.cashOut / maxValue) * 100 : 0
  const isPositive = entry.net >= 0

  return (
    <div className={`flex flex-col items-center gap-1 min-w-0 ${entry.isForecast ? "opacity-50" : ""}`}>
      <div className="text-xs text-gray-500 font-medium truncate w-full text-center">
        {formatEur(entry.net)}
      </div>
      <div className="flex items-end gap-0.5 h-24 w-full justify-center">
        <div
          className="w-3 bg-green-400 rounded-t transition-all"
          style={{ height: `${inHeight}%` }}
          title={`Ein: ${formatEur(entry.cashIn)}`}
        />
        <div
          className="w-3 bg-red-300 rounded-t transition-all"
          style={{ height: `${outHeight}%` }}
          title={`Aus: ${formatEur(entry.cashOut)}`}
        />
      </div>
      <div className="text-xs text-gray-400 truncate w-full text-center">{entry.label}</div>
      {entry.isForecast && (
        <div className="text-xs text-blue-400 italic text-center">prog.</div>
      )}
    </div>
  )
}

export default function CashflowDashboard() {
  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState(12)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/cashflow?months=${months}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden")
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allEntries = data ? [...data.timeline, ...data.forecast] : []
  const maxValue = allEntries.length > 0
    ? Math.max(...allEntries.map((e) => Math.max(e.cashIn, e.cashOut)), 1)
    : 1

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/finance" className="hover:text-gray-700">Finanzen</Link>
              <span>›</span>
              <span>Cash Flow</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">💰 Cash Flow Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={6}>6 Monate</option>
              <option value={12}>12 Monate</option>
              <option value={24}>24 Monate</option>
            </select>
            <button
              onClick={fetchData}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Aktualisieren
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">Lade Cash Flow Daten...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Fehler: {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                title="MRR"
                value={formatEur(data.kpis.mrr)}
                subtitle="Ø letzte 3 Monate"
                icon={<TrendingUp size={18} />}
                color="green"
                trend="up"
              />
              <KpiCard
                title="ARR"
                value={formatEur(data.kpis.arr)}
                subtitle="Jahresumsatz (hochgerechnet)"
                icon={<DollarSign size={18} />}
                color="blue"
              />
              <KpiCard
                title="Burn Rate"
                value={formatEur(data.kpis.burnRate)}
                subtitle="Ø monatl. Ausgaben"
                icon={<TrendingDown size={18} />}
                color={data.kpis.burnRate > data.kpis.mrr ? "red" : "gray"}
              />
              <KpiCard
                title="Runway"
                value={data.kpis.runway !== null ? `${data.kpis.runway} Mo.` : "∞"}
                subtitle="Monate bis Balance 0"
                icon={<Clock size={18} />}
                color={
                  data.kpis.runway === null
                    ? "green"
                    : data.kpis.runway < 3
                    ? "red"
                    : data.kpis.runway < 6
                    ? "orange"
                    : "green"
                }
              />
              <KpiCard
                title="Balance"
                value={formatEur(data.kpis.currentBalance)}
                subtitle="Kumuliertes Saldo"
                icon={<DollarSign size={18} />}
                color={data.kpis.currentBalance >= 0 ? "green" : "red"}
                trend={data.kpis.currentBalance >= 0 ? "up" : "down"}
              />
            </div>

            {/* Current Month Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 md:col-span-2">
                <h2 className="font-medium text-gray-700 mb-4 text-sm">
                  📊 Monatlicher Cash Flow{" "}
                  <span className="text-gray-400 text-xs font-normal ml-1">
                    (grün = Einnahmen · rot = Ausgaben)
                  </span>
                </h2>
                <div className="flex items-end gap-1 overflow-x-auto pb-2">
                  {allEntries.map((entry, i) => (
                    <div key={i} className="flex-1 min-w-[40px]">
                      <CashflowBar entry={entry} maxValue={maxValue} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Forderungen */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <h2 className="font-medium text-gray-700 text-sm">📄 Offene Forderungen</h2>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatEur(data.kpis.openReceivables)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.kpis.openInvoiceCount} offene Rechnungen
                  </div>
                </div>
                {data.kpis.overdueReceivables > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="text-sm font-medium text-red-700">
                      {formatEur(data.kpis.overdueReceivables)}
                    </div>
                    <div className="text-xs text-red-500">Überfällig</div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-xs text-gray-500 mb-2">Aktueller Monat</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">▲ {formatEur(data.kpis.currentMonthCashIn)}</span>
                    <span className="text-red-500">▼ {formatEur(data.kpis.currentMonthCashOut)}</span>
                  </div>
                </div>
                <Link
                  href="/finance"
                  className="block text-xs text-blue-600 hover:underline text-center"
                >
                  Alle Rechnungen anzeigen →
                </Link>
              </div>
            </div>

            {/* Forecast Table */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="font-medium text-gray-700 mb-3 text-sm">
                🔮 3-Monats-Prognose{" "}
                <span className="text-gray-400 text-xs font-normal">
                  (basiert auf Ø der letzten 3 Monate)
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium text-xs">Monat</th>
                      <th className="text-right py-2 text-gray-500 font-medium text-xs">Einnahmen</th>
                      <th className="text-right py-2 text-gray-500 font-medium text-xs">Ausgaben</th>
                      <th className="text-right py-2 text-gray-500 font-medium text-xs">Netto</th>
                      <th className="text-right py-2 text-gray-500 font-medium text-xs">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forecast.map((f, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 text-gray-600">
                          {f.label}
                          <span className="ml-2 text-xs text-blue-400 italic">Prognose</span>
                        </td>
                        <td className="py-2.5 text-right text-green-600">{formatEur(f.cashIn)}</td>
                        <td className="py-2.5 text-right text-red-500">{formatEur(f.cashOut)}</td>
                        <td className={`py-2.5 text-right font-medium ${f.net >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {f.net >= 0 ? "+" : ""}{formatEur(f.net)}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">{formatEur(f.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-gray-400 text-right">
              Generiert: {new Date(data.generatedAt).toLocaleString("de-DE")}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
