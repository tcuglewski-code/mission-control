import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification, type NotificationType } from '@/lib/notifications';

const SUPPORT_PROJECT_NAME = 'Support & Tickets';

/**
 * POST /api/webhooks/support
 * 
 * Webhook-Endpunkt für Support-Anfragen (Emails, Formulare, externe Systeme)
 * Erstellt automatisch ein Ticket und optional einen Task.
 * 
 * Auth: x-api-key oder x-support-secret Header
 * 
 * Body:
 * {
 *   type: 'email' | 'form' | 'api',
 *   ticket: {
 *     subject: string,       // Betreff / Titel
 *     description: string,   // Beschreibung des Problems
 *     email: string,         // Kontakt-Email
 *     name?: string,         // Name des Anfragenden
 *     priority?: 'low' | 'medium' | 'high' | 'critical',
 *     category?: 'bug' | 'feature' | 'support' | 'question',
 *     tenant?: string,       // Kunde/Tenant (z.B. 'koch-aufforstung')
 *     app?: string,          // Betroffene App (z.B. 'forstmanager', 'mobile-app')
 *   },
 *   createTask?: boolean,    // Soll zusätzlich ein Task erstellt werden?
 * }
 */
export async function POST(request: NextRequest) {
  // ─── Auth-Validierung ──────────────────────────────────────────────────────
  const apiKey = request.headers.get('x-api-key');
  const supportSecret = request.headers.get('x-support-secret');
  const validApiKey = process.env.MC_API_KEY;
  const validSupportSecret = process.env.SUPPORT_WEBHOOK_SECRET;

  const isAuthorized =
    (apiKey && apiKey === validApiKey) ||
    (supportSecret && supportSecret === validSupportSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type = 'api', ticket, createTask = false } = body;

    // ─── Validierung ───────────────────────────────────────────────────────────
    if (!ticket || !ticket.subject || !ticket.email) {
      return NextResponse.json(
        { error: 'Missing required ticket data (subject, email)' },
        { status: 400 }
      );
    }

    // ─── Support-Projekt finden oder erstellen ─────────────────────────────────
    let supportProject = await prisma.project.findFirst({
      where: { name: SUPPORT_PROJECT_NAME },
    });

    if (!supportProject) {
      supportProject = await prisma.project.create({
        data: {
          name: SUPPORT_PROJECT_NAME,
          description: 'Zentrales Ticketsystem für Support-Anfragen aller Tenants',
          longDescription: `
## Support & Tickets

Dieses Projekt sammelt alle Support-Anfragen, Bug-Reports und Feature-Requests.

### Ticket-Kategorien
- **bug** — Fehler und Probleme
- **feature** — Feature-Requests und Verbesserungsvorschläge
- **support** — Allgemeine Support-Anfragen
- **question** — Fragen zur Nutzung

### Prioritäten
- **critical** — Produktionsausfall, sofortige Reaktion nötig
- **high** — Wichtig, zeitnah bearbeiten
- **medium** — Normale Priorität
- **low** — Nice-to-have, keine Eile

### Workflow
1. Ticket kommt rein (via Webhook, Email oder manuell)
2. Triage: Kategorie + Priorität + Zuweisung
3. Bearbeitung
4. Lösung + Feedback an Kunden
5. Ticket schließen
          `.trim(),
          status: 'active',
          priority: 'high',
          color: '#dc2626', // Rot für Support
        },
      });
    }

    // ─── Ticket-Nummer generieren ──────────────────────────────────────────────
    const ticketCount = await prisma.ticket.count();
    const ticketNumber = `SUP-${(ticketCount + 1).toString().padStart(5, '0')}`;

    // ─── Ticket erstellen ──────────────────────────────────────────────────────
    const priority = ticket.priority || 'medium';
    const category = ticket.category || 'support';

    const newTicket = await prisma.ticket.create({
      data: {
        title: `[${ticketNumber}] ${ticket.subject}`,
        description: formatTicketDescription(ticket, type, ticketNumber),
        status: 'open',
        priority,
        category,
        projectId: supportProject.id,
      },
    });

    // ─── Optional: Task erstellen für Nachverfolgung ───────────────────────────
    let linkedTask = null;
    if (createTask || priority === 'critical') {
      linkedTask = await prisma.task.create({
        data: {
          title: `🎫 ${ticketNumber}: ${ticket.subject}`,
          description: `
## Support-Ticket

**Ticket-ID:** ${ticketNumber}
**Kategorie:** ${category}
**Priorität:** ${priority}
**Von:** ${ticket.name || 'Unbekannt'} <${ticket.email}>
${ticket.tenant ? `**Tenant:** ${ticket.tenant}` : ''}
${ticket.app ? `**App:** ${ticket.app}` : ''}

---

${ticket.description || '(keine Beschreibung)'}

---

### Checkliste

- [ ] Ticket analysieren
- [ ] Reproduzieren (falls Bug)
- [ ] Lösung implementieren oder dokumentieren
- [ ] Kunden benachrichtigen
- [ ] Ticket schließen
          `.trim(),
          status: 'todo',
          priority: priority === 'critical' ? 'high' : 'medium',
          labels: `support,${category}${ticket.tenant ? `,${ticket.tenant}` : ''}`,
          projectId: supportProject.id,
        },
      });

      // Ticket mit Task verknüpfen
      await prisma.ticket.update({
        where: { id: newTicket.id },
        data: { taskId: linkedTask.id },
      });
    }

    // ─── Activity Log ──────────────────────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        type: 'ticket_created',
        action: `Neues Support-Ticket: ${ticketNumber} (${category}, ${priority})`,
        meta: JSON.stringify({
          ticketId: newTicket.id,
          ticketNumber,
          email: ticket.email,
          category,
          priority,
          tenant: ticket.tenant,
          source: type,
          taskId: linkedTask?.id,
        }),
        projectId: supportProject.id,
      },
    });

    // ─── Admins benachrichtigen ────────────────────────────────────────────────
    const admins = await prisma.authUser.findMany({
      where: { role: 'admin', active: true },
      select: { id: true },
    });

    const notificationTitle =
      priority === 'critical'
        ? `🚨 Kritisches Ticket: ${ticketNumber}`
        : `🎫 Neues Ticket: ${ticketNumber}`;

    await Promise.allSettled(
      admins.map((admin) =>
        createNotification(
          admin.id,
          'ticket_created' as NotificationType,
          notificationTitle,
          `${ticket.subject} — von ${ticket.email}`,
          `/tickets/${newTicket.id}`
        )
      )
    );

    // ─── Response ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      ticketNumber,
      ticketId: newTicket.id,
      taskId: linkedTask?.id,
      projectId: supportProject.id,
      message: `Support ticket ${ticketNumber} created`,
    });
  } catch (error) {
    console.error('[Support Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/support
 * Health check + API documentation
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/support',
    method: 'POST',
    description: 'Webhook endpoint for support tickets (email forwarding, forms, external systems)',
    requiredHeaders: {
      'x-api-key': 'MC_API_KEY or',
      'x-support-secret': 'SUPPORT_WEBHOOK_SECRET',
    },
    body: {
      type: "'email' | 'form' | 'api'",
      ticket: {
        subject: 'string (required)',
        email: 'string (required)',
        description: 'string',
        name: 'string',
        priority: "'low' | 'medium' | 'high' | 'critical'",
        category: "'bug' | 'feature' | 'support' | 'question'",
        tenant: 'string (e.g. koch-aufforstung)',
        app: 'string (e.g. forstmanager, mobile-app)',
      },
      createTask: 'boolean (default: false, true for critical)',
    },
    envRequired: ['MC_API_KEY', 'SUPPORT_WEBHOOK_SECRET (optional alternative)'],
  });
}

// ─── Helper: Ticket-Beschreibung formatieren ─────────────────────────────────
function formatTicketDescription(
  ticket: {
    subject: string;
    description?: string;
    email: string;
    name?: string;
    priority?: string;
    category?: string;
    tenant?: string;
    app?: string;
  },
  source: string,
  ticketNumber: string
): string {
  return `
## Ticket-Details

| Feld | Wert |
|------|------|
| **Ticket-Nr.** | ${ticketNumber} |
| **Quelle** | ${source} |
| **Von** | ${ticket.name || 'Unbekannt'} |
| **E-Mail** | ${ticket.email} |
| **Kategorie** | ${ticket.category || 'support'} |
| **Priorität** | ${ticket.priority || 'medium'} |
${ticket.tenant ? `| **Tenant** | ${ticket.tenant} |` : ''}
${ticket.app ? `| **App** | ${ticket.app} |` : ''}
| **Eingegangen** | ${new Date().toISOString()} |

---

## Beschreibung

${ticket.description || '(keine Beschreibung angegeben)'}
  `.trim();
}
