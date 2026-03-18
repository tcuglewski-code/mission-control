import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json();
  const job = await prisma.cronJob.update({ where: { id: params.id }, data });
  return NextResponse.json(job);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cronJob.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
