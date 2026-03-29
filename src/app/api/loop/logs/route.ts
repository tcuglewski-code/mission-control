import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Letzte 50 Logs
export async function GET() {
  try {
    const logs = await prisma.loopLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching loop logs:', error);
    return NextResponse.json([]);
  }
}

// POST: Neuen Log eintragen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, message, level } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const log = await prisma.loopLog.create({
      data: {
        taskId: taskId || null,
        message,
        level: level || 'info',
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating loop log:', error);
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
  }
}

// DELETE: Alle Logs löschen
export async function DELETE() {
  try {
    await prisma.loopLog.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing loop logs:', error);
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
