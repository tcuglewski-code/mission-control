import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionOrApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const jobs = await prisma.cronJob.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const user = await getSessionOrApiKey(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await req.json();
  const job = await prisma.cronJob.create({ data });
  return NextResponse.json(job, { status: 201 });
}
