import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrApiKey, AuthResult } from '@/lib/api-auth'
import { logActivity } from '@/lib/audit'

// GET /api/decisions — Liste aller Entscheidungen
export async function GET(req: NextRequest) {
  const auth: AuthResult = await getSessionOrApiKey(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')
  const search = searchParams.get('search')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isArchived: false,
  }

  if (category && category !== 'all') {
    where.category = category
  }
  if (status && status !== 'all') {
    where.status = status
  }
  if (projectId) {
    where.projectId = projectId
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { decision: { contains: search, mode: 'insensitive' } },
      { context: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } },
    ]
  }

  const decisions = await prisma.decision.findMany({
    where,
    orderBy: { decisionDate: 'desc' },
  })

  return NextResponse.json(decisions)
}

// POST /api/decisions — Neue Entscheidung erstellen
export async function POST(req: NextRequest) {
  const auth: AuthResult = await getSessionOrApiKey(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      title,
      decisionDate,
      context,
      decision,
      alternatives,
      impact,
      category,
      ownerId,
      ownerName,
      projectId,
      projectName,
      tags,
    } = body

    if (!title || !decision) {
      return NextResponse.json(
        { error: 'Titel und Entscheidung sind Pflichtfelder' },
        { status: 400 }
      )
    }

    const newDecision = await prisma.decision.create({
      data: {
        title,
        decisionDate: decisionDate ? new Date(decisionDate) : new Date(),
        context,
        decision,
        alternatives,
        impact,
        category: category || 'Tech',
        ownerId,
        ownerName,
        projectId,
        projectName,
        tags,
      },
    })

    // Audit Log
    await logActivity({
      action: 'DECISION_CREATED',
      entityType: 'decision',
      entityId: newDecision.id,
      entityName: title,
      userId: auth.userId,
      userEmail: auth.userEmail,
      projectId,
      details: { category },
    })

    return NextResponse.json(newDecision, { status: 201 })
  } catch (error) {
    console.error('Error creating decision:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Entscheidung' },
      { status: 500 }
    )
  }
}
