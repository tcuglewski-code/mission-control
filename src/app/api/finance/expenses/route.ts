/**
 * /api/finance/expenses
 * Sprint AF069 — Cash Flow Dashboard: Betriebsausgaben
 *
 * GET  - Liste aller Ausgaben (mit Filter + Pagination)
 * POST - Neue Ausgabe erstellen
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey, requireAdminFromDb } from "@/lib/api-auth"
import { logActivity } from "@/lib/audit"

const EXPENSE_CATEGORIES = [
  "Hosting",    // Vercel, Hostinger
  "SaaS",       // Neon, Anthropic, OpenAI
  "Personal",   // Löhne, Freelancer
  "Marketing",  // Ads, Events
  "Tools",      // Software-Lizenzen
  "Sonstiges",
]

export async function GET(request: NextRequest) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"))
  const category = searchParams.get("category") || undefined
  const vendor = searchParams.get("vendor") || undefined
  const months = parseInt(searchParams.get("months") || "12")

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const where: any = {
    date: { gte: startDate },
  }
  if (category) where.category = category
  if (vendor) where.vendor = { contains: vendor, mode: "insensitive" }

  const [expenses, total, categoryTotals] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: startDate } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  // Monthly totals for chart
  const monthlyTotals = await prisma.expense.groupBy({
    by: [],
    where: { date: { gte: startDate } },
    _sum: { amount: true },
  })

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const recurringTotal = expenses
    .filter((e) => e.recurring)
    .reduce((sum, e) => sum + e.amount, 0)

  return NextResponse.json({
    success: true,
    expenses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    summary: {
      totalAmount: Math.round(totalAmount * 100) / 100,
      recurringMonthly: Math.round(recurringTotal * 100) / 100,
      byCategory: categoryTotals.map((c) => ({
        category: c.category,
        total: Math.round((c._sum.amount || 0) * 100) / 100,
        count: c._count.id,
      })),
    },
    categories: EXPENSE_CATEGORIES,
  })
}

export async function POST(request: NextRequest) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only admins can create expenses
  const admin = await requireAdminFromDb()
  if (!admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, description, amount, category, vendor, date, recurring, projectId, notes, receipt } = body

    if (!title || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "title und amount (> 0) sind Pflichtfelder" },
        { status: 400 }
      )
    }

    // Validate category
    const validCategory = EXPENSE_CATEGORIES.includes(category) ? category : "Sonstiges"

    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        amount: Math.round(amount * 100) / 100,
        category: validCategory,
        vendor: vendor?.trim() || null,
        date: date ? new Date(date) : new Date(),
        recurring: Boolean(recurring),
        projectId: projectId || null,
        notes: notes?.trim() || null,
        receipt: receipt?.trim() || null,
        createdBy: user.id,
      },
    })

    await logActivity({
      action: "EXPENSE_CREATED",
      entityType: "expense",
      entityId: expense.id,
      entityName: expense.title,
      userId: user.id,
      userEmail: user.email || undefined,
      details: {
        amount: expense.amount,
        category: expense.category,
        vendor: expense.vendor,
        recurring: expense.recurring,
      },
    })

    return NextResponse.json({ success: true, expense }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/finance/expenses]", error)
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Ausgabe" },
      { status: 500 }
    )
  }
}
