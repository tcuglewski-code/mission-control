import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireServerSession } from '@/lib/auth-helpers'
import { logActivity } from '@/lib/audit'

// GET: Einzelnen Trigger laden
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const trigger = await prisma.upsellTrigger.findUnique({
      where: { id }
    })

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 })
    }

    return NextResponse.json(trigger)

  } catch (error) {
    console.error('Get trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to load trigger' },
      { status: 500 }
    )
  }
}

// PATCH: Trigger aktualisieren (Status, Notizen)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { status, notes } = body

    const updateData: Record<string, unknown> = {}

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (status) {
      updateData.status = status

      // Timestamps setzen
      const now = new Date()
      switch (status) {
        case 'contacted':
          updateData.contactedAt = now
          break
        case 'converted':
          updateData.convertedAt = now
          break
        case 'dismissed':
          updateData.dismissedAt = now
          break
      }
    }

    const trigger = await prisma.upsellTrigger.update({
      where: { id },
      data: updateData
    })

    // Audit Log
    await logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'UPSELL_TRIGGER_UPDATED',
      resource: 'upsell_trigger',
      resourceId: id,
      details: {
        tenantName: trigger.tenantName,
        newStatus: status,
        notes: notes ? '(aktualisiert)' : undefined
      }
    })

    return NextResponse.json({
      success: true,
      trigger
    })

  } catch (error) {
    console.error('Update trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to update trigger' },
      { status: 500 }
    )
  }
}

// DELETE: Trigger löschen
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { id } = await params

  try {
    const trigger = await prisma.upsellTrigger.delete({
      where: { id }
    })

    // Audit Log
    await logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'UPSELL_TRIGGER_DELETED',
      resource: 'upsell_trigger',
      resourceId: id,
      details: {
        tenantName: trigger.tenantName,
        triggerType: trigger.triggerType
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to delete trigger' },
      { status: 500 }
    )
  }
}
