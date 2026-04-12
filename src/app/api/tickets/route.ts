import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from "@/lib/audit";
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

/**
 * GET /api/tickets
 * Liste aller Tickets mit Filtern
 */
export async function GET(request: NextRequest) {
  const auth = await getSessionOrApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const projectId = searchParams.get('projectId');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [
          { priority: 'asc' }, // critical first
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
    ]);

    // Prioritäts-Sortierung
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedTickets = tickets.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      tickets: sortedTickets,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('[GET /api/tickets]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/tickets
 * Neues Ticket erstellen
 */
export async function POST(request: NextRequest) {
  const auth = await getSessionOrApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, priority, category, projectId, assigneeId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    // Ticket-Nummer generieren
    const ticketCount = await prisma.ticket.count();
    const ticketNumber = `SUP-${(ticketCount + 1).toString().padStart(5, '0')}`;

    const ticket = await prisma.ticket.create({
      data: {
        title: title.startsWith('[SUP-') ? title : `[${ticketNumber}] ${title}`,
        description,
        status: 'open',
        priority: priority || 'medium',
        category: category || 'support',
        projectId,
        assigneeId,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: 'ticket_created',
        entityType: 'ticket',
        entityId: ticket.id,
        entityName: ticketNumber,
        userId: null,
        userEmail: auth.email,
        projectId,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tickets]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
