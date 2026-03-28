import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

const PAGE_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden – nur Admins' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')   ?? '1'));
    const action = searchParams.get('action') ?? undefined;   // Filter: create | update | delete | login | webhook
    const resource = searchParams.get('resource') ?? undefined; // Filter: task | project | ...
    const search = searchParams.get('search') ?? undefined;

    const where = {
      ...(action   ? { action }               : {}),
      ...(resource ? { entityType: resource } : {}),
      ...(search   ? {
        OR: [
          { entityName: { contains: search, mode: 'insensitive' as const } },
          { userEmail:  { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user:    { select: { name: true, email: true, avatar: true, role: true } },
          project: { select: { name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        take:  PAGE_LIMIT,
        skip:  (page - 1) * PAGE_LIMIT,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / PAGE_LIMIT),
    });
  } catch (error) {
    console.error('[GET /api/audit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
