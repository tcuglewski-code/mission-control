import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

/**
 * GET /api/tickets/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('[GET /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/tickets/[id]
 * Ticket aktualisieren
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, description, status, priority, category, assigneeId, taskId } = body;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(category !== undefined && { category }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(taskId !== undefined && { taskId }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Log changes
    const changes: string[] = [];
    if (status && status !== existing.status) changes.push(`Status: ${existing.status} → ${status}`);
    if (priority && priority !== existing.priority) changes.push(`Priorität: ${existing.priority} → ${priority}`);
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) changes.push('Zuweisung geändert');

    if (changes.length > 0) {
      await prisma.activityLog.create({
        data: {
          entityType: 'ticket',
        entityId: id,
        entityName: id,
        action: 'ticket_updated',
          action: `Ticket aktualisiert: ${changes.join(', ')}`,
          userId: null,
          userEmail: auth.email,
          meta: JSON.stringify({ ticketId: id, changes }),
          projectId: existing.projectId,
        },
      });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('[PATCH /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tickets/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        entityType: 'ticket',
        entityId: id,
        entityName: id,
        action: 'ticket_deleted',
        action: `Ticket gelöscht: ${existing.title}`,
        userId: null,
        userEmail: auth.email,
        meta: JSON.stringify({ ticketId: id }),
        projectId: existing.projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
