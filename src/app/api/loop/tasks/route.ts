import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Liste alle Loop Tasks (sortiert nach Prio + CreatedAt)
export async function GET() {
  try {
    const tasks = await prisma.loopTask.findMany({
      orderBy: [
        { priority: 'asc' }, // high < medium < low alphabetisch, aber wir sortieren im Code
        { createdAt: 'asc' },
      ],
    });

    // Richtige Prio-Sortierung: high > medium > low
    const prioOrder = { high: 0, medium: 1, low: 2 };
    const sorted = tasks.sort((a, b) => {
      const prioA = prioOrder[a.priority as keyof typeof prioOrder] ?? 1;
      const prioB = prioOrder[b.priority as keyof typeof prioOrder] ?? 1;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error fetching loop tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST: Neue Task erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, repo, priority } = body;

    if (!title || !repo) {
      return NextResponse.json(
        { error: 'title and repo are required' },
        { status: 400 }
      );
    }

    const task = await prisma.loopTask.create({
      data: {
        title,
        description: description || null,
        repo,
        priority: priority || 'medium',
        status: 'todo',
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating loop task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
