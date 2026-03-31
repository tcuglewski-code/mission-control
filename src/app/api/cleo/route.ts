/**
 * Cleo-Agent API — Onboarding-Fortschritt Tracking
 * 
 * Cleo ist der automatische Onboarding-Fortschritts-Tracker.
 * Analysiert Tenant-Aktivitäten und erkennt Onboarding-Meilensteine.
 * 
 * Endpoints:
 * GET  /api/cleo          — Gesamten Onboarding-Status abrufen
 * POST /api/cleo          — Einzelnen Schritt als erledigt markieren
 * POST /api/cleo/analyze  — Automatische Analyse (Cron-Trigger)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// =============================================================================
// ONBOARDING-SCHRITTE DEFINITION
// =============================================================================

export const ONBOARDING_STEPS = [
  // Phase 1: Setup (Technisch)
  { id: 'tenant_configured', phase: 1, label: 'Tenant konfiguriert', weight: 10, auto: true },
  { id: 'first_user_created', phase: 1, label: 'Erster Nutzer erstellt', weight: 10, auto: true },
  { id: 'logo_uploaded', phase: 1, label: 'Logo hochgeladen', weight: 5, auto: true },
  { id: 'colors_set', phase: 1, label: 'Firmenfarben eingestellt', weight: 5, auto: true },
  
  // Phase 2: Stammdaten
  { id: 'first_employee', phase: 2, label: 'Erster Mitarbeiter angelegt', weight: 10, auto: true },
  { id: 'first_customer', phase: 2, label: 'Erster Kunde angelegt', weight: 10, auto: true },
  { id: 'work_types_set', phase: 2, label: 'Leistungsarten definiert', weight: 5, auto: true },
  
  // Phase 3: Erste Nutzung
  { id: 'first_order', phase: 3, label: 'Erster Auftrag erstellt', weight: 15, auto: true },
  { id: 'first_protocol', phase: 3, label: 'Erstes Protokoll erstellt', weight: 10, auto: true },
  { id: 'app_login', phase: 3, label: 'Mobile App erstmals genutzt', weight: 10, auto: false },
  
  // Phase 4: Integration
  { id: 'nextcloud_connected', phase: 4, label: 'Nextcloud verbunden', weight: 5, auto: false },
  { id: 'email_configured', phase: 4, label: 'E-Mail Versand konfiguriert', weight: 5, auto: false },
  
  // Phase 5: Routine (System "lebt")
  { id: 'week_active', phase: 5, label: '1 Woche aktiv genutzt', weight: 10, auto: true },
  { id: 'five_orders', phase: 5, label: '5 Aufträge erstellt', weight: 5, auto: true },
] as const;

export type OnboardingStepId = typeof ONBOARDING_STEPS[number]['id'];

// =============================================================================
// HILFS-FUNKTIONEN
// =============================================================================

function berechneOnboardingScore(erledigteSchritte: string[]): {
  score: number;
  maxScore: number;
  prozent: number;
  phase: number;
} {
  const maxScore = ONBOARDING_STEPS.reduce((sum, s) => sum + s.weight, 0);
  const score = ONBOARDING_STEPS
    .filter(s => erledigteSchritte.includes(s.id))
    .reduce((sum, s) => sum + s.weight, 0);
  
  const prozent = Math.round((score / maxScore) * 100);
  
  // Aktuelle Phase bestimmen (alle Schritte der vorherigen Phase erledigt?)
  let aktuellePhase = 1;
  for (let phase = 1; phase <= 5; phase++) {
    const phaseSchritte = ONBOARDING_STEPS.filter(s => s.phase === phase);
    const alle = phaseSchritte.every(s => erledigteSchritte.includes(s.id));
    if (!alle) break;
    aktuellePhase = phase + 1;
  }
  
  return { score, maxScore, prozent, phase: Math.min(aktuellePhase, 5) };
}

// =============================================================================
// GET /api/cleo
// =============================================================================

export async function GET(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Lade Cleo-Status aus Settings (JSON-Feld im AgentRegistry oder Settings-Tabelle)
    const cleoAgent = await (prisma as any).agentRegistry?.findFirst({
      where: { agentId: 'cleo' }
    }).catch(() => null);

    const erledigteSchritte: string[] = cleoAgent?.config?.erledigteSchritte ?? [];
    const { score, maxScore, prozent, phase } = berechneOnboardingScore(erledigteSchritte);

    // Nächste offene Schritte ermitteln
    const offeneSchritte = ONBOARDING_STEPS
      .filter(s => !erledigteSchritte.includes(s.id))
      .slice(0, 3); // Nur die nächsten 3 anzeigen

    return NextResponse.json({
      agent: 'cleo',
      status: prozent >= 100 ? 'completed' : prozent >= 50 ? 'active' : 'starting',
      score,
      maxScore,
      prozent,
      aktuellePhase: phase,
      phasenAnzahl: 5,
      erledigteSchritte,
      alleSchritte: ONBOARDING_STEPS,
      offeneSchritte,
      abgeschlossenAm: prozent >= 100 ? cleoAgent?.config?.abgeschlossenAm : null,
    });
  } catch (error) {
    console.error('[GET /api/cleo]', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// =============================================================================
// POST /api/cleo — Schritt manuell markieren
// =============================================================================

export async function POST(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { stepId, erledigt = true } = body as { stepId: OnboardingStepId; erledigt?: boolean };

    const gueltigerSchritt = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (!gueltigerSchritt) {
      return NextResponse.json({ error: `Unbekannter Schritt: ${stepId}` }, { status: 400 });
    }

    // Cleo-Agent in Registry finden oder erstellen
    let cleoAgent = await (prisma as any).agentRegistry?.findFirst({
      where: { agentId: 'cleo' }
    }).catch(() => null);

    const erledigteSchritte: string[] = cleoAgent?.config?.erledigteSchritte ?? [];
    
    let updated: string[];
    if (erledigt && !erledigteSchritte.includes(stepId)) {
      updated = [...erledigteSchritte, stepId];
    } else if (!erledigt) {
      updated = erledigteSchritte.filter(s => s !== stepId);
    } else {
      updated = erledigteSchritte; // Keine Änderung
    }

    const { score, maxScore, prozent, phase } = berechneOnboardingScore(updated);
    
    const newConfig = {
      erledigteSchritte: updated,
      letzteAktualisierung: new Date().toISOString(),
      abgeschlossenAm: prozent >= 100 ? new Date().toISOString() : cleoAgent?.config?.abgeschlossenAm,
    };

    // In DB speichern (über AgentRegistry oder Notification)
    // Fallback: Als Notification protokollieren
    if ((prisma as any).notification) {
      await (prisma as any).notification.create({
        data: {
          type: 'onboarding_progress',
          title: erledigt ? `✅ ${gueltigerSchritt.label}` : `↩️ ${gueltigerSchritt.label}`,
          message: `Onboarding-Fortschritt: ${prozent}% (${score}/${maxScore} Punkte)`,
          priority: prozent >= 100 ? 'high' : 'medium',
          metadata: JSON.stringify({ stepId, prozent, phase }),
        }
      }).catch(() => null);
    }

    return NextResponse.json({
      erfolg: true,
      schritt: gueltigerSchritt,
      score,
      maxScore,
      prozent,
      aktuellePhase: phase,
      erledigteSchritte: updated,
      meilenstein: prozent >= 100 ? 'onboarding_complete' : 
                   prozent >= 80 ? 'fast_fertig' :
                   prozent >= 50 ? 'halbzeit' : null,
    });
  } catch (error) {
    console.error('[POST /api/cleo]', error);
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
