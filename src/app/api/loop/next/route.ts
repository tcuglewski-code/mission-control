import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Nächsten todo Task zurückgeben (höchste Prio: high > medium > low, ältester zuerst)
export async function GET(request: NextRequest) {
  try {
    // Token-Validierung falls LOOP_SECRET gesetzt
    const loopSecret = process.env.LOOP_SECRET;
    if (loopSecret) {
      const token = request.headers.get('x-loop-token');
      if (token !== loopSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Alle todo Tasks holen
    const tasks = await prisma.loopTask.findMany({
      where: { status: 'todo' },
    });

    if (tasks.length === 0) {
      return NextResponse.json(null);
    }

    // Sortierung: high > medium > low, dann ältester zuerst
    const prioOrder = { high: 0, medium: 1, low: 2 };
    const sorted = tasks.sort((a, b) => {
      const prioA = prioOrder[a.priority as keyof typeof prioOrder] ?? 1;
      const prioB = prioOrder[b.priority as keyof typeof prioOrder] ?? 1;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json(sorted[0]);
  } catch (error) {
    console.error('Error fetching next loop task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}
