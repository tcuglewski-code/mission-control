/**
 * Seed: Support-Projekt + Labels
 * 
 * Erstellt das Support-Projekt und alle nötigen Labels für das Ticketsystem.
 * Idempotent: Kann mehrfach ausgeführt werden ohne Duplikate.
 * 
 * Ausführen: npx ts-node prisma/seed-support.ts
 * oder: npm run db:seed:support
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPPORT_PROJECT_ID = 'support-tickets-project';

const SUPPORT_LABELS = [
  // Kategorien
  { name: 'bug', color: '#dc2626' },           // Rot
  { name: 'feature', color: '#8b5cf6' },       // Violett
  { name: 'support', color: '#3b82f6' },       // Blau
  { name: 'question', color: '#6b7280' },      // Grau
  
  // Prioritäten
  { name: 'critical', color: '#ef4444' },      // Hellrot
  { name: 'high', color: '#f97316' },          // Orange
  { name: 'medium', color: '#eab308' },        // Gelb
  { name: 'low', color: '#22c55e' },           // Grün
  
  // Status
  { name: 'open', color: '#3b82f6' },
  { name: 'in_progress', color: '#f59e0b' },
  { name: 'resolved', color: '#22c55e' },
  { name: 'closed', color: '#6b7280' },
  { name: 'blocked', color: '#ef4444' },
  
  // Tenants
  { name: 'koch-aufforstung', color: '#2C3A1C' },
  { name: 'appfabrik', color: '#059669' },
  
  // Apps
  { name: 'forstmanager', color: '#365314' },
  { name: 'mobile-app', color: '#1e40af' },
  { name: 'website', color: '#7c3aed' },
  { name: 'mission-control', color: '#f59e0b' },
];

async function main() {
  console.log('🎫 Setting up Support & Tickets system...\n');

  // ─── Support-Projekt ─────────────────────────────────────────────────────────
  const supportProject = await prisma.project.upsert({
    where: { id: SUPPORT_PROJECT_ID },
    update: {
      name: 'Support & Tickets',
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

### Webhook-Endpunkt
\`POST /api/webhooks/support\`

Header: \`x-api-key: MC_API_KEY\` oder \`x-support-secret: SUPPORT_WEBHOOK_SECRET\`

### E-Mail Weiterleitung
Richte eine E-Mail-Weiterleitung ein:
\`support@appfabrik.de\` → Webhook (z.B. via Mailgun, SendGrid, Zapier)
      `.trim(),
      status: 'active',
      priority: 'high',
      color: '#dc2626',
    },
    create: {
      id: SUPPORT_PROJECT_ID,
      name: 'Support & Tickets',
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

### Webhook-Endpunkt
\`POST /api/webhooks/support\`

Header: \`x-api-key: MC_API_KEY\` oder \`x-support-secret: SUPPORT_WEBHOOK_SECRET\`

### E-Mail Weiterleitung
Richte eine E-Mail-Weiterleitung ein:
\`support@appfabrik.de\` → Webhook (z.B. via Mailgun, SendGrid, Zapier)
      `.trim(),
      status: 'active',
      priority: 'high',
      color: '#dc2626',
    },
  });

  console.log(`✅ Support-Projekt: ${supportProject.name} (${supportProject.id})`);

  // ─── Labels ──────────────────────────────────────────────────────────────────
  let created = 0;
  let existing = 0;

  for (const label of SUPPORT_LABELS) {
    try {
      await prisma.label.upsert({
        where: { name: label.name },
        update: { color: label.color },
        create: { name: label.name, color: label.color },
      });
      created++;
    } catch {
      existing++;
    }
  }

  console.log(`✅ Labels: ${created} erstellt/aktualisiert, ${existing} bereits vorhanden`);

  // ─── Demo-Ticket (optional) ──────────────────────────────────────────────────
  const demoTicket = await prisma.ticket.upsert({
    where: { id: 'demo-support-ticket' },
    update: {},
    create: {
      id: 'demo-support-ticket',
      title: '[SUP-00001] 🎉 Willkommen im Ticketsystem',
      description: `
## Demo-Ticket

Dies ist ein Beispiel-Ticket um das System zu demonstrieren.

### Details
- **Von:** demo@appfabrik.de
- **Kategorie:** support
- **Priorität:** low

### Beschreibung
Das Ticketsystem ist erfolgreich eingerichtet! 

Tickets können erstellt werden via:
1. **Webhook:** POST /api/webhooks/support
2. **E-Mail Weiterleitung:** support@appfabrik.de → Webhook
3. **Manuell:** /admin/tickets (geplant)

### Nächste Schritte
- [ ] E-Mail-Weiterleitung einrichten (Mailgun/SendGrid)
- [ ] SUPPORT_WEBHOOK_SECRET in Vercel ENV setzen
- [ ] Ticket-UI in /admin/tickets bauen
      `.trim(),
      status: 'resolved',
      priority: 'low',
      category: 'support',
      projectId: supportProject.id,
    },
  });

  console.log(`✅ Demo-Ticket: ${demoTicket.title}`);

  // ─── BoardColumn für Tickets ─────────────────────────────────────────────────
  const columns = [
    { name: 'Offen', statusKey: 'open', order: 0, color: '#3b82f6' },
    { name: 'In Bearbeitung', statusKey: 'in_progress', order: 1, color: '#f59e0b' },
    { name: 'Gelöst', statusKey: 'resolved', order: 2, color: '#22c55e' },
    { name: 'Geschlossen', statusKey: 'closed', order: 3, color: '#6b7280' },
  ];

  for (const col of columns) {
    await prisma.boardColumn.upsert({
      where: {
        id: `support-col-${col.statusKey}`,
      },
      update: {
        name: col.name,
        color: col.color,
        order: col.order,
      },
      create: {
        id: `support-col-${col.statusKey}`,
        projectId: supportProject.id,
        name: col.name,
        statusKey: col.statusKey,
        order: col.order,
        color: col.color,
      },
    });
  }

  console.log(`✅ Board-Spalten: ${columns.length} für Ticket-Workflow`);

  console.log('\n🎫 Support-System erfolgreich eingerichtet!');
  console.log(`\n📌 Nächste Schritte:
1. SUPPORT_WEBHOOK_SECRET in Vercel ENV setzen
2. E-Mail-Weiterleitung von support@appfabrik.de einrichten
3. Webhook-URL: POST /api/webhooks/support
`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
