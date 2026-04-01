import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrApiKey } from '@/lib/api-auth'
import { logActivity } from '@/lib/audit'

// GET /api/risks/[id] — Einzelnes Risiko abrufen
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrApiKey(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const risk = await prisma.risk.findUnique({
      where: { id }
    })

    if (!risk) {
      return NextResponse.json({ error: 'Risiko nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(risk)
  } catch (error) {
    console.error('[API] GET /api/risks/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/risks/[id] — Risiko aktualisieren
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrApiKey(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.risk.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Risiko nicht gefunden' }, { status: 404 })
    }

    // Risk Score neu berechnen wenn probability oder impact geändert
    const probability = body.probability ?? existing.probability
    const impact = body.impact ?? existing.impact
    const riskScore = probability * impact

    const risk = await prisma.risk.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        probability,
        impact,
        riskScore,
        status: body.status,
        mitigations: body.mitigations,
        contingency: body.contingency,
        ownerId: body.ownerId,
        ownerName: body.ownerName,
        projectId: body.projectId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        lastReviewedAt: body.lastReviewedAt ? new Date(body.lastReviewedAt) : undefined
      }
    })

    await logActivity({
      action: 'RISK_UPDATED',
      entityType: 'risk',
      entityId: risk.id,
      entityName: risk.title,
      userId: session.user?.id,
      userEmail: session.user?.email,
      details: { 
        oldStatus: existing.status, 
        newStatus: risk.status,
        oldScore: existing.riskScore,
        newScore: riskScore
      }
    })

    return NextResponse.json(risk)
  } catch (error) {
    console.error('[API] PUT /api/risks/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/risks/[id] — Risiko löschen
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrApiKey(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.risk.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Risiko nicht gefunden' }, { status: 404 })
    }

    await prisma.risk.delete({ where: { id } })

    await logActivity({
      action: 'RISK_DELETED',
      entityType: 'risk',
      entityId: id,
      entityName: existing.title,
      userId: session.user?.id,
      userEmail: session.user?.email
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/risks/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
