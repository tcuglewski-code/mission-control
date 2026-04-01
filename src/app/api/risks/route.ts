import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrApiKey } from '@/lib/api-auth'
import { logActivity } from '@/lib/audit'

// GET /api/risks — Liste aller Risiken
export async function GET(req: Request) {
  try {
    const session = await getSessionOrApiKey(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const projectId = searchParams.get('projectId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category
    if (projectId) where.projectId = projectId

    const risks = await prisma.risk.findMany({
      where,
      orderBy: [
        { riskScore: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(risks)
  } catch (error) {
    console.error('[API] GET /api/risks error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/risks — Neues Risiko erstellen
export async function POST(req: Request) {
  try {
    const session = await getSessionOrApiKey(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      category = 'Tech',
      probability = 3,
      impact = 3,
      status = 'identified',
      mitigations,
      contingency,
      ownerId,
      ownerName,
      projectId,
      dueDate
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }

    // Risk Score berechnen (1-25)
    const riskScore = probability * impact

    const risk = await prisma.risk.create({
      data: {
        title,
        description,
        category,
        probability,
        impact,
        riskScore,
        status,
        mitigations,
        contingency,
        ownerId,
        ownerName,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    })

    await logActivity({
      action: 'RISK_CREATED',
      entityType: 'risk',
      entityId: risk.id,
      entityName: risk.title,
      userId: session.user?.id,
      userEmail: session.user?.email,
      details: { category, probability, impact, riskScore }
    })

    return NextResponse.json(risk, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/risks error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
