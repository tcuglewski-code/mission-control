# Ersttermin-Workflow: Calendly + automatische Bestätigung

> **Ziel:** Strukturierter Akquise-Prozess für Feldhub-Interessenten — von der Terminbuchung bis zur automatischen Task-Erstellung in Mission Control.

---

## 1. Calendly Event Type: "Feldhub Erstgespräch"

### Empfohlene Einstellungen

| Parameter | Wert | Begründung |
|-----------|------|-----------|
| **Event Name** | Feldhub Erstgespräch — 30 Min | Klar, professionell |
| **Dauer** | 30 Minuten | Reicht für Erstkontakt, schätzt Zeit beider Seiten |
| **Location** | Google Meet / Zoom | Remote-first für KMU-Entscheider |
| **Zeitzone** | Europe/Berlin (GMT+1) | Fokus D/A/CH |
| **Verfügbarkeit** | Di-Do, 10:00-16:00 | Beste Erreichbarkeit für Geschäftsführer |
| **Buffer vor/nach** | 15 Min | Vorbereitung + Nachbereitung |
| **Min. Vorlaufzeit** | 24h | Zeit für Recherche über den Lead |
| **Max. Terminzeitraum** | 4 Wochen | Keine zu fernen Termine |

### Pflichtfragen bei Buchung

Diese Felder im Calendly-Formular aktivieren:

1. **Unternehmen** (Text, Pflicht)
   - Label: "Name Ihres Unternehmens"
   
2. **Branche** (Dropdown, Pflicht)
   - Optionen: Forstwirtschaft, Landschaftsbau, Tiefbau, Garten- und Landschaftspflege, Reinigung, Handwerk, Landwirtschaft, Sonstige
   
3. **Mitarbeiteranzahl** (Dropdown, Pflicht)
   - Optionen: 1-5, 6-20, 21-50, 51-100, 100+
   
4. **Aktuelle Software** (Text, Optional)
   - Label: "Welche Software nutzen Sie aktuell für Aufträge/Zeiterfassung?"
   
5. **Hauptinteresse** (Checkboxen, Pflicht)
   - Optionen: Mobile App für Außendienst, Auftragsmanagement, Zeiterfassung, Förderberatung, Rechnungswesen, Alles aus einer Hand

### Calendly-Link Format

```
https://calendly.com/feldhub/erstgespraech
```

**Mit UTM-Tracking (für Kampagnen):**
```
https://calendly.com/feldhub/erstgespraech?utm_source=website&utm_medium=cta&utm_campaign=homepage
https://calendly.com/feldhub/erstgespraech?utm_source=linkedin&utm_medium=social&utm_campaign=forstbranche
```

---

## 2. Bestätigungs-Email Templates

### 2.1 Sofortige Buchungsbestätigung (Calendly built-in)

Calendly → Event Type → Notifications → Confirmation Email anpassen:

**Betreff:**
```
✅ Termin bestätigt: Feldhub Erstgespräch am {{event_date}}
```

**Body:**
```
Hallo {{invitee_first_name}},

vielen Dank für Ihr Interesse an Feldhub! Ihr Termin ist bestätigt:

📅 {{event_date}} um {{event_time}} Uhr
📍 {{location}} (Link im Kalender-Eintrag)
⏱️ 30 Minuten

Was wir besprechen:
• Ihre aktuellen Herausforderungen im Außendienst
• Wie andere Unternehmen Ihrer Branche mit Feldhub arbeiten
• Ob Feldhub für Sie passt — ohne Verkaufsdruck

Zur Vorbereitung empfehle ich:
→ Kurz überlegen: Was kostet Sie aktuell am meisten Zeit/Nerven?

Bei Fragen vorab: Antworten Sie einfach auf diese Mail.

Bis bald!

Tomek Cuglewski
Gründer, Feldhub
📞 +49 XXX XXXXXXX
🌐 feldhub.de
```

### 2.2 Reminder-Email (24h vorher)

Calendly → Reminders aktivieren (24h vorher):

**Betreff:**
```
Erinnerung: Unser Gespräch morgen um {{event_time}} Uhr
```

**Body:**
```
Hallo {{invitee_first_name}},

kurze Erinnerung an unser Gespräch morgen:

📅 {{event_date}}, {{event_time}} Uhr
📍 {{location}}

Ich freue mich darauf, mehr über {{answer_1}} zu erfahren und zu schauen, 
wie wir Ihnen helfen können.

Bis morgen!
Tomek
```

### 2.3 Follow-Up Email (manuell nach Termin)

Template für Tomek — nach dem Erstgespräch innerhalb von 24h versenden:

**Betreff:**
```
Unser Gespräch heute — nächste Schritte
```

**Body:**
```
Hallo {{Name}},

vielen Dank für das gute Gespräch heute!

Wie besprochen hier die nächsten Schritte:

[VARIANTE A: Interesse an Demo]
✅ Ich richte Ihnen einen Demo-Zugang ein (erhalten Sie bis [Datum])
✅ Sie schauen sich das System in Ruhe an
✅ Wir telefonieren nächste Woche kurz für Rückfragen

[VARIANTE B: Angebot gewünscht]
✅ Ich sende Ihnen bis [Datum] ein Angebot zu
✅ Sie prüfen es mit Ihrem Team
✅ Bei Fragen melden Sie sich jederzeit

[VARIANTE C: Noch zu früh]
✅ Ich melde mich in [X Wochen/Monaten] nochmal
✅ Sie können jederzeit auf mich zukommen

Hier nochmal der Link zu unserer Case Study mit Koch Aufforstung:
→ feldhub.de/case-study-koch-aufforstung

Bei Fragen: Einfach antworten oder anrufen.

Beste Grüße
Tomek

---
Tomek Cuglewski
Gründer, Feldhub
📞 +49 XXX XXXXXXX
📧 tomek@feldhub.de
```

---

## 3. Automatische Task-Erstellung in Mission Control

### 3.1 Calendly Webhook einrichten

**Calendly Pro/Teams erforderlich** für Webhooks.

1. Calendly → Integrations → Webhooks
2. Neuen Webhook erstellen:
   - **URL:** `https://mission-control-tawny-omega.vercel.app/api/webhooks/calendly`
   - **Events:** `invitee.created` (Termin gebucht)
   - **Signing Key:** Generieren und in Vercel ENV speichern als `CALENDLY_WEBHOOK_SECRET`

### 3.2 Webhook-Handler in Mission Control

Neuer API-Endpoint erstellen: `src/app/api/webhooks/calendly/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Calendly Webhook Secret aus ENV
const CALENDLY_WEBHOOK_SECRET = process.env.CALENDLY_WEBHOOK_SECRET;

function verifyCalendlySignature(payload: string, signature: string): boolean {
  if (!CALENDLY_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', CALENDLY_WEBHOOK_SECRET);
  const expectedSignature = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('calendly-webhook-signature') || '';

  // Signatur verifizieren
  if (!verifyCalendlySignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const data = JSON.parse(payload);
  
  // Nur invitee.created Events verarbeiten
  if (data.event !== 'invitee.created') {
    return NextResponse.json({ status: 'ignored' });
  }

  const invitee = data.payload;
  const answers = invitee.questions_and_answers || [];
  
  // Antworten extrahieren
  const getAnswer = (question: string) => 
    answers.find((a: any) => a.question.includes(question))?.answer || 'N/A';

  const company = getAnswer('Unternehmen');
  const branch = getAnswer('Branche');
  const employees = getAnswer('Mitarbeiter');
  const interest = getAnswer('Hauptinteresse');

  // Task in Mission Control anlegen
  const task = await prisma.task.create({
    data: {
      title: `🗓️ Erstgespräch: ${invitee.name} (${company})`,
      description: `
**Neuer Lead über Calendly**

- **Name:** ${invitee.name}
- **Email:** ${invitee.email}
- **Unternehmen:** ${company}
- **Branche:** ${branch}
- **Mitarbeiter:** ${employees}
- **Interesse:** ${interest}
- **Termin:** ${invitee.event.start_time}

**Calendly-Link:** ${invitee.cancel_url}

---
*Automatisch erstellt via Calendly-Webhook*
      `.trim(),
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(invitee.event.start_time),
      // Sales-Pipeline-Projekt (ID anpassen nach Setup)
      projectId: 'SALES_PIPELINE_PROJECT_ID',
      labels: ['lead', 'calendly', branch.toLowerCase()],
    },
  });

  // Optional: Slack-Notification
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🗓️ Neuer Ersttermin gebucht!\n*${invitee.name}* von *${company}* (${branch})\n📅 ${new Date(invitee.event.start_time).toLocaleString('de-DE')}`,
      }),
    });
  }

  return NextResponse.json({ 
    status: 'ok', 
    taskId: task.id 
  });
}
```

### 3.3 Erforderliche ENV-Variablen

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Wert | Beschreibung |
|----------|------|-------------|
| `CALENDLY_WEBHOOK_SECRET` | (von Calendly generiert) | Webhook-Signatur-Verifizierung |

---

## 4. Workflow-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│  1. BUCHUNG                                                     │
│  ─────────                                                      │
│  Lead findet Calendly-Link (Website, LinkedIn, Email)           │
│  → Füllt Formular aus (Firma, Branche, Interesse)               │
│  → Wählt verfügbaren Termin                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. AUTOMATISCH (Calendly + Webhook)                            │
│  ────────────                                                   │
│  → Bestätigungs-Email an Lead (sofort)                          │
│  → Kalender-Einladung an beide (sofort)                         │
│  → MC-Task erstellt mit allen Lead-Infos (via Webhook)          │
│  → Optional: Slack-Notification                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. VORBEREITUNG (Tomek, 24h vorher)                            │
│  ─────────────                                                  │
│  → MC-Task öffnen, Lead recherchieren                           │
│  → Perplexity: Firma googlen, Pain Points antizipieren          │
│  → Demo-Umgebung ggf. mit Branchendaten vorbereiten             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. ERSTGESPRÄCH (30 Min)                                       │
│  ────────────                                                   │
│  → Kennenlernen, Pain Points verstehen                          │
│  → Feldhub kurz zeigen (nicht zu viel!)                         │
│  → Nächsten Schritt vereinbaren (Demo, Angebot, Warteliste)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. FOLLOW-UP (innerhalb 24h)                                   │
│  ─────────                                                      │
│  → Follow-Up Email mit Zusammenfassung + nächsten Schritten     │
│  → MC-Task auf "IN_PROGRESS" setzen                             │
│  → Sales-Pipeline-Status aktualisieren                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Checkliste für Tomek

### Einmalige Einrichtung

- [ ] Calendly-Account anlegen (Pro-Plan für Webhooks, ~12€/Monat)
- [ ] Event Type "Feldhub Erstgespräch" erstellen mit obigen Einstellungen
- [ ] Pflichtfragen im Formular aktivieren
- [ ] Bestätigungs- und Reminder-Emails anpassen
- [ ] Webhook einrichten → MC-Endpoint
- [ ] `CALENDLY_WEBHOOK_SECRET` in Vercel ENV setzen
- [ ] Webhook-Handler deployen (s. Code oben)
- [ ] Test-Buchung durchführen → Task in MC prüfen

### Pro Termin

- [ ] MC-Task öffnen, Lead kurz recherchieren
- [ ] Gespräch führen, Notizen in MC-Task
- [ ] Follow-Up Email senden (Template nutzen)
- [ ] Sales-Pipeline-Status updaten

---

## 6. Alternativen zu Calendly

Falls Calendly zu teuer / zu eingeschränkt:

| Tool | Preis | Webhooks | Empfehlung |
|------|-------|----------|------------|
| **Calendly** | 12€/Monat (Pro) | ✅ Ja | Standard, empfohlen |
| **Cal.com** | 0€ (Self-hosted) | ✅ Ja | Open Source, mehr Aufwand |
| **TidyCal** | 29€ einmalig | ❌ Nein | Nur für einfache Buchungen |
| **Google Calendar** | 0€ | ❌ Nein | Keine Formulare, nur Slots |

**Empfehlung:** Calendly Pro. Zahlt sich bei 1-2 Leads/Monat durch Zeitersparnis aus.

---

*Erstellt: 2026-03-31 | AF063 | Amadeus*
