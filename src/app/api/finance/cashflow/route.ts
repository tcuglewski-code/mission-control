/**
 * GET /api/finance/cashflow
 * Sprint JQ — Cash Flow Dashboard in Mission Control
 *
 * Gibt monatliche Cash-In / Cash-Out Daten zurück:
 * - Einnahmen (bezahlte Rechnungen)
 * - Ausgaben (manuelle Buchungen / Kosteneinträge)
 * - Netto-Cashflow pro Monat
 * - Laufendes Saldo
 * - 3-Monats-Prognose
 * - MRR / ARR Berechnung
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthsBack = Math.min(parseInt(searchParams.get("months") || "12"), 24)

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

  // Fetch paid invoices grouped by month
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      updatedAt: { gte: startDate },
    },
    select: {
      amount: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "asc" },
  }).catch(() => [])

  // Fetch expenses (try expense model, fallback to empty)
  const expenses = await (prisma as any).expense?.findMany({
    where: {
      date: { gte: startDate },
    },
    select: {
      amount: true,
      date: true,
      category: true,
    },
    orderBy: { date: "asc" },
  }).catch(() => []) || []

  // Group by month key (YYYY-MM)
  const monthlyData: Record<string, { cashIn: number; cashOut: number; invoices: number }> = {}

  // Pre-fill all months
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthlyData[key] = { cashIn: 0, cashOut: 0, invoices: 0 }
  }

  // Fill cash in from invoices
  for (const inv of paidInvoices) {
    const d = new Date(inv.updatedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthlyData[key]) {
      monthlyData[key].cashIn += Number(inv.amount) || 0
      monthlyData[key].invoices++
    }
  }

  // Fill cash out from expenses
  for (const exp of expenses) {
    const d = new Date(exp.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthlyData[key]) {
      monthlyData[key].cashOut += Number(exp.amount) || 0
    }
  }

  // Build timeline with running balance
  let runningBalance = 0
  const timeline = Object.entries(monthlyData).map(([key, data]) => {
    const net = data.cashIn - data.cashOut
    runningBalance += net
    return {
      month: key,
      label: new Date(key + "-01").toLocaleDateString("de-DE", {
        month: "short",
        year: "2-digit",
      }),
      cashIn: Math.round(data.cashIn * 100) / 100,
      cashOut: Math.round(data.cashOut * 100) / 100,
      net: Math.round(net * 100) / 100,
      balance: Math.round(runningBalance * 100) / 100,
      invoices: data.invoices,
    }
  })

  // Current month stats
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentMonth = monthlyData[currentKey] || { cashIn: 0, cashOut: 0 }

  // Last 3 months average (for forecast)
  const last3 = timeline.slice(-4, -1) // exclude current month
  const avgCashIn = last3.length > 0
    ? last3.reduce((s, m) => s + m.cashIn, 0) / last3.length
    : 0
  const avgCashOut = last3.length > 0
    ? last3.reduce((s, m) => s + m.cashOut, 0) / last3.length
    : 0

  // 3-month forecast
  const forecast = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    const forecastKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const net = avgCashIn - avgCashOut
    runningBalance += net
    return {
      month: forecastKey,
      label: d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      cashIn: Math.round(avgCashIn * 100) / 100,
      cashOut: Math.round(avgCashOut * 100) / 100,
      net: Math.round(net * 100) / 100,
      balance: Math.round(runningBalance * 100) / 100,
      isForecast: true,
    }
  })

  // Open receivables
  const openInvoices = await prisma.invoice.aggregate({
    where: { status: { in: ["OPEN", "SENT", "PARTIAL"] } },
    _sum: { amount: true },
    _count: { id: true },
  }).catch(() => ({ _sum: { amount: 0 }, _count: { id: 0 } }))

  const overdueInvoices = await prisma.invoice.aggregate({
    where: { status: "OVERDUE" },
    _sum: { amount: true },
  }).catch(() => ({ _sum: { amount: 0 } }))

  // MRR: average monthly revenue of last 3 months
  const mrr = Math.round(avgCashIn * 100) / 100
  const arr = Math.round(mrr * 12 * 100) / 100

  // Burn rate (avg monthly cash out)
  const burnRate = Math.round(avgCashOut * 100) / 100

  // Runway in months (balance / burn rate)
  const currentBalance = timeline[timeline.length - 1]?.balance || 0
  const runway = burnRate > 0 ? Math.round((currentBalance / burnRate) * 10) / 10 : null

  return NextResponse.json({
    success: true,
    kpis: {
      mrr,
      arr,
      burnRate,
      runway,
      currentBalance: Math.round(currentBalance * 100) / 100,
      openReceivables: Math.round((Number(openInvoices._sum.amount) || 0) * 100) / 100,
      openInvoiceCount: openInvoices._count.id,
      overdueReceivables: Math.round((Number(overdueInvoices._sum.amount) || 0) * 100) / 100,
      currentMonthCashIn: Math.round(currentMonth.cashIn * 100) / 100,
      currentMonthCashOut: Math.round(currentMonth.cashOut * 100) / 100,
    },
    timeline,
    forecast,
    generatedAt: new Date().toISOString(),
  })
}
