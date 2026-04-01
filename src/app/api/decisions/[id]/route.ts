import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrApiKey, AuthResult } from '@/lib/api-auth'
import { logActivity } from '@/lib/audit'

// GET /api/decisions/[id] — Einzelne Entscheidung abrufen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth: AuthResult = await getSessionOrApiKey(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params

  const decision = await prisma.decision.findUnique({
    where: { id },
  })

  if (!decision) {
    return NextResponse.json(
      { error: 'Entscheidung nicht gefunden' },
      { status: 404 }
    )
  }

  return NextResponse.json(decision)
}

// PUT /api/decisions/[id] — Entscheidung aktualisieren
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth: AuthResult = await getSessionOrApiKey(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params

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
      status,
      ownerId,
      ownerName,
      projectId,
      projectName,
      tags,
      supersededBy,
      reversedReason,
      isArchived,
    } = body

    const existingDecision = await prisma.decision.findUnique({
      where: { id },
    })

    if (!existingDecision) {
      return NextResponse.json(
        { error: 'Entscheidung nicht gefunden' },
        { status: 404 }
      )
    }

    const updatedDecision = await prisma.decision.update({
      where: { id },
      data: {
        title: title ?? existingDecision.title,
        decisionDate: decisionDate ? new Date(decisionDate) : existingDecision.decisionDate,
        context: context ?? existingDecision.context,
        decision: decision ?? existingDecision.decision,
        alternatives: alternatives ?? existingDecision.alternatives,
        impact: impact ?? existingDecision.impact,
        category: category ?? existingDecision.category,
        status: status ?? existingDecision.status,
        ownerId: ownerId ?? existingDecision.ownerId,
        ownerName: ownerName ?? existingDecision.ownerName,
        projectId: projectId ?? existingDecision.projectId,
        projectName: projectName ?? existingDecision.projectName,
        tags: tags ?? existingDecision.tags,
        supersededBy: supersededBy ?? existingDecision.supersededBy,
        reversedReason: reversedReason ?? existingDecision.reversedReason,
        isArchived: isArchived ?? existingDecision.isArchived,
        updatedAt: new Date(),
      },
    })

    // Audit Log
    await logActivity({
      action: 'DECISION_UPDATED',
      entityType: 'decision',
      entityId: id,
      entityName: updatedDecision.title,
      userId: auth.userId,
      userEmail: auth.userEmail,
      projectId: updatedDecision.projectId ?? undefined,
      details: { status: updatedDecision.status, category: updatedDecision.category },
    })

    return NextResponse.json(updatedDecision)
  } catch (error) {
    console.error('Error updating decision:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Entscheidung' },
      { status: 500 }
    )
  }
}

// DELETE /api/decisions/[id] — Entscheidung löschen (soft delete via isArchived)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth: AuthResult = await getSessionOrApiKey(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params

  const decision = await prisma.decision.findUnique({
    where: { id },
  })

  if (!decision) {
    return NextResponse.json(
      { error: 'Entscheidung nicht gefunden' },
      { status: 404 }
    )
  }

  // Soft Delete
  await prisma.decision.update({
    where: { id },
    data: { isArchived: true },
  })

  // Audit Log
  await logActivity({
    action: 'DECISION_DELETED',
    entityType: 'decision',
    entityId: id,
    entityName: decision.title,
    userId: auth.userId,
    userEmail: auth.userEmail,
    projectId: decision.projectId ?? undefined,
  })

  return NextResponse.json({ success: true, message: 'Entscheidung archiviert' })
}
