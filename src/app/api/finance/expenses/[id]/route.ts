/**
 * /api/finance/expenses/[id]
 * Sprint AF069 — Cash Flow Dashboard: Einzelne Ausgabe
 *
 * GET    - Details einer Ausgabe
 * PUT    - Ausgabe bearbeiten
 * DELETE - Ausgabe löschen
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionOrApiKey, requireAdminFromDb } from "@/lib/api-auth"
import { logActivity } from "@/lib/audit"

const EXPENSE_CATEGORIES = [
  "Hosting",
  "SaaS",
  "Personal",
  "Marketing",
  "Tools",
  "Sonstiges",
]

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const expense = await prisma.expense.findUnique({
    where: { id },
  })

  if (!expense) {
    return NextResponse.json({ error: "Ausgabe nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json({ success: true, expense })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await requireAdminFromDb()
  if (!admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 })
  }

  const { id } = await params

  try {
    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Ausgabe nicht gefunden" }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, amount, category, vendor, date, recurring, projectId, notes, receipt } = body

    // Build update object
    const updateData: any = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount <= 0) {
        return NextResponse.json({ error: "amount muss > 0 sein" }, { status: 400 })
      }
      updateData.amount = Math.round(amount * 100) / 100
    }
    if (category !== undefined) {
      updateData.category = EXPENSE_CATEGORIES.includes(category) ? category : "Sonstiges"
    }
    if (vendor !== undefined) updateData.vendor = vendor?.trim() || null
    if (date !== undefined) updateData.date = new Date(date)
    if (recurring !== undefined) updateData.recurring = Boolean(recurring)
    if (projectId !== undefined) updateData.projectId = projectId || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (receipt !== undefined) updateData.receipt = receipt?.trim() || null

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    await logActivity({
      action: "EXPENSE_UPDATED",
      entityType: "expense",
      entityId: expense.id,
      entityName: expense.title,
      userId: user.id,
      userEmail: user.email || undefined,
      details: {
        oldAmount: existing.amount,
        newAmount: expense.amount,
        changes: Object.keys(updateData),
      },
    })

    return NextResponse.json({ success: true, expense })
  } catch (error) {
    console.error("[PUT /api/finance/expenses/[id]]", error)
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionOrApiKey(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await requireAdminFromDb()
  if (!admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 })
  }

  const { id } = await params

  try {
    const expense = await prisma.expense.findUnique({ where: { id } })
    if (!expense) {
      return NextResponse.json({ error: "Ausgabe nicht gefunden" }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    await logActivity({
      action: "EXPENSE_DELETED",
      entityType: "expense",
      entityId: id,
      entityName: expense.title,
      userId: user.id,
      userEmail: user.email || undefined,
      details: {
        amount: expense.amount,
        category: expense.category,
        vendor: expense.vendor,
      },
    })

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    console.error("[DELETE /api/finance/expenses/[id]]", error)
    return NextResponse.json(
      { error: "Fehler beim Löschen" },
      { status: 500 }
    )
  }
}
