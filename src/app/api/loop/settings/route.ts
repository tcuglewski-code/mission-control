import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_SETTINGS = {
  id: 'singleton',
  enabled: false,
  scheduleExpr: '0,30 1-4 * * *',
  timezone: 'Europe/Berlin',
  maxTasksPerNight: 8,
  model: 'anthropic/claude-opus-4-5',
};

// GET: Einstellungen laden
export async function GET() {
  try {
    let settings = await prisma.loopSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (!settings) {
      // Defaults zurückgeben (ohne in DB zu speichern)
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching loop settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// PUT: Einstellungen updaten (upsert)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, scheduleExpr, timezone, maxTasksPerNight, model } = body;

    const settings = await prisma.loopSettings.upsert({
      where: { id: 'singleton' },
      update: {
        enabled: enabled ?? false,
        scheduleExpr: scheduleExpr ?? '0,30 1-4 * * *',
        timezone: timezone ?? 'Europe/Berlin',
        maxTasksPerNight: maxTasksPerNight ?? 8,
        model: model ?? 'anthropic/claude-opus-4-5',
      },
      create: {
        id: 'singleton',
        enabled: enabled ?? false,
        scheduleExpr: scheduleExpr ?? '0,30 1-4 * * *',
        timezone: timezone ?? 'Europe/Berlin',
        maxTasksPerNight: maxTasksPerNight ?? 8,
        model: model ?? 'anthropic/claude-opus-4-5',
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating loop settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
