import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const jobs = await prisma.cronJob.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const job = await prisma.cronJob.create({ data });
  return NextResponse.json(job, { status: 201 });
}
