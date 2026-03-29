import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SALES_PROJECT_NAME = 'AppFabrik Sales Pipeline';

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.MC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { source, lead } = body;

    if (!lead || !lead.email || !lead.unternehmen) {
      return NextResponse.json(
        { error: 'Missing required lead data (email, unternehmen)' },
        { status: 400 }
      );
    }

    // Find or create Sales project
    let salesProject = await prisma.project.findFirst({
      where: { name: SALES_PROJECT_NAME },
    });

    if (!salesProject) {
      salesProject = await prisma.project.create({
        data: {
          name: SALES_PROJECT_NAME,
          description: 'AppFabrik Lead-Tracking und Sales-Pipeline',
          status: 'active',
          priority: 'high',
          color: '#22c55e', // green
        },
      });
    }

    // Create task for the lead
    const taskTitle = `🔔 Neuer Lead: ${lead.unternehmen}`;
    const taskDescription = `
## Lead-Details

**Name:** ${lead.name || '—'}
**E-Mail:** ${lead.email}
**Telefon:** ${lead.telefon || '—'}
**Unternehmen:** ${lead.unternehmen}
**Branche:** ${lead.branche || '—'}
**Mitarbeiter:** ${lead.mitarbeiter || '—'}

---

## Nachricht

${lead.nachricht || '(keine Nachricht)'}

---

**Eingegangen:** ${lead.timestamp || new Date().toISOString()}
**Quelle:** ${source || 'website'}
**IP:** ${lead.ip || '—'}

---

### Nächste Schritte

- [ ] Kontakt aufnehmen (binnen 48h)
- [ ] Bedarf qualifizieren
- [ ] Demo-Termin vereinbaren
`.trim();

    const task = await prisma.task.create({
      data: {
        title: taskTitle,
        description: taskDescription,
        status: 'todo',
        priority: 'high',
        labels: 'lead,prospect',
        projectId: salesProject.id,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'lead_captured',
        action: `Neuer Lead eingegangen: ${lead.unternehmen} (${lead.branche})`,
        meta: JSON.stringify({
          taskId: task.id,
          email: lead.email,
          branche: lead.branche,
          mitarbeiter: lead.mitarbeiter,
          source,
        }),
        projectId: salesProject.id,
      },
    });

    return NextResponse.json({
      success: true,
      taskId: task.id,
      projectId: salesProject.id,
      message: `Lead task created: ${task.title}`,
    });
  } catch (error) {
    console.error('[Lead Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/lead',
    method: 'POST',
    requiredHeaders: ['x-api-key'],
    body: {
      source: 'string',
      lead: {
        name: 'string',
        email: 'string (required)',
        telefon: 'string',
        unternehmen: 'string (required)',
        branche: 'string',
        mitarbeiter: 'string',
        nachricht: 'string',
        timestamp: 'ISO string',
        ip: 'string',
      },
    },
  });
}
