/**
 * Cleo-Agent — Automatische Analyse
 * POST /api/cleo/analyze
 * 
 * Analysiert Tenant-Aktivitäten und erkennt automatisch
 * welche Onboarding-Schritte abgeschlossen sind.
 * 
 * Wird täglich per Cron aufgerufen.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { ONBOARDING_STEPS, type OnboardingStepId } from "../route";

// =============================================================================
// AUTO-ERKENNUNG
// =============================================================================

async function autoAnalyze(): Promise<{
  erkannt: OnboardingStepId[];
  checks: Record<string, boolean>;
}> {
  const erkannt: OnboardingStepId[] = [];
  const checks: Record<string, boolean> = {};

  try {
    // 1. Erster Mitarbeiter angelegt?
    const mitarbeiterAnzahl = await (prisma as any).employee?.count().catch(() => 0) ?? 0;
    checks.first_employee = mitarbeiterAnzahl > 0;
    if (mitarbeiterAnzahl > 0) erkannt.push('first_employee');

    // 2. Erster Kunde angelegt?
    const kundenAnzahl = await (prisma as any).customer?.count().catch(() => 0) ?? 
                         await (prisma as any).waldbesitzer?.count().catch(() => 0) ?? 0;
    checks.first_customer = kundenAnzahl > 0;
    if (kundenAnzahl > 0) erkannt.push('first_customer');

    // 3. Erster Auftrag erstellt?
    const auftragAnzahl = await (prisma as any).auftrag?.count().catch(() => 0) ?? 
                          await (prisma as any).order?.count().catch(() => 0) ?? 0;
    checks.first_order = auftragAnzahl > 0;
    checks.five_orders = auftragAnzahl >= 5;
    if (auftragAnzahl > 0) erkannt.push('first_order');
    if (auftragAnzahl >= 5) erkannt.push('five_orders');

    // 4. Erstes Protokoll?
    const protokollAnzahl = await (prisma as any).dailyReport?.count().catch(() => 0) ?? 
                             await (prisma as any).protocol?.count().catch(() => 0) ?? 0;
    checks.first_protocol = protokollAnzahl > 0;
    if (protokollAnzahl > 0) erkannt.push('first_protocol');

    // 5. User erstellt?
    const userAnzahl = await (prisma as any).authUser?.count().catch(() => 0) ?? 0;
    checks.first_user_created = userAnzahl > 0;
    if (userAnzahl > 0) erkannt.push('first_user_created');

    // 6. System läuft schon >7 Tage?
    const ersterUser = await (prisma as any).authUser?.findFirst({
      orderBy: { createdAt: 'asc' }
    }).catch(() => null);
    
    if (ersterUser?.createdAt) {
      const tageAktiv = Math.floor(
        (Date.now() - new Date(ersterUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      checks.week_active = tageAktiv >= 7;
      if (tageAktiv >= 7) erkannt.push('week_active');
    } else {
      checks.week_active = false;
    }

    // 7. Tenant konfiguriert (System läuft = konfiguriert)
    checks.tenant_configured = true;
    erkannt.push('tenant_configured');

  } catch (error) {
    console.error('[cleo/analyze] Fehler bei Auto-Analyse:', error);
  }

  return { erkannt, checks };
}

// =============================================================================
// POST /api/cleo/analyze
// =============================================================================

export async function POST(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { erkannt, checks } = await autoAnalyze();

    // Gesamten Status aufbauen
    const maxScore = ONBOARDING_STEPS.reduce((sum, s) => sum + s.weight, 0);
    const score = ONBOARDING_STEPS
      .filter(s => erkannt.includes(s.id as OnboardingStepId))
      .reduce((sum, s) => sum + s.weight, 0);
    const prozent = Math.round((score / maxScore) * 100);

    // Protokolliere die Analyse als Activity
    if ((prisma as any).activityLog) {
      await (prisma as any).activityLog.create({
        data: {
          type: 'cleo_analysis',
          beschreibung: `Onboarding-Analyse: ${erkannt.length} Schritte erkannt, ${prozent}% abgeschlossen`,
          metadata: JSON.stringify({ erkannt, checks, score, prozent }),
          userId: session.id,
        }
      }).catch(() => null);
    }

    // Benachrichtigung bei Meilensteinen
    const meilensteine = [];
    if (prozent >= 100) meilensteine.push('🎉 Onboarding vollständig abgeschlossen!');
    if (prozent >= 80 && prozent < 100) meilensteine.push('🚀 Fast fertig — noch ein paar Schritte!');
    if (prozent >= 50 && prozent < 80) meilensteine.push('💪 Halbzeit erreicht!');

    return NextResponse.json({
      erfolg: true,
      analyse: {
        erkannteSchritte: erkannt,
        checks,
        anzahl: erkannt.length,
        gesamt: ONBOARDING_STEPS.length,
      },
      score: {
        score,
        maxScore,
        prozent,
      },
      meilensteine,
      naechsteSchritte: ONBOARDING_STEPS
        .filter(s => !erkannt.includes(s.id as OnboardingStepId) && s.auto === false)
        .slice(0, 3)
        .map(s => ({ id: s.id, label: s.label, phase: s.phase })),
    });
  } catch (error) {
    console.error('[POST /api/cleo/analyze]', error);
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 });
  }
}
