/**
 * Customer Onboarding API - Single Resource (AF083: Cleo-Agent)
 * 
 * GET    - Einzelnes Onboarding laden
 * PATCH  - Onboarding updaten (Checkpoints, Status, etc.)
 * DELETE - Onboarding löschen
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-helpers";

// Route: /api/customer-onboarding/[id]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getSessionOrApiKey(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const onboarding = await prisma.customerOnboarding.findUnique({
      where: { id },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Onboarding nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ onboarding });
  } catch (err: any) {
    console.error("[Onboarding API] GET Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getSessionOrApiKey(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Erlaubte Update-Felder
    const allowedFields = [
      // Status
      "status", "week",
      // Woche 1
      "w1_kickoff", "w1_requirements", "w1_configPlan",
      // Woche 2
      "w2_domain", "w2_database", "w2_appSetup", "w2_dataImport",
      // Woche 3
      "w3_adminTraining", "w3_workerTraining", "w3_testRun",
      // Woche 4
      "w4_finalCheck", "w4_goLive", "w4_supportHandover",
      // Zusätzliche
      "avvSigned", "contractSigned", "firstPayment",
      // Meta
      "contactName", "contactEmail", "targetGoLive", "actualGoLive",
      "notes", "ownerName", "ownerId", "projectId",
    ];

    const updateData: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        // Datums-Felder konvertieren
        if (["targetGoLive", "actualGoLive"].includes(key) && body[key]) {
          updateData[key] = new Date(body[key]);
        } else {
          updateData[key] = body[key];
        }
      }
    }

    // Automatisch Woche hochzählen wenn alle Checkpoints einer Woche erledigt
    const currentOnboarding = await prisma.customerOnboarding.findUnique({
      where: { id },
    });

    if (currentOnboarding) {
      const mergedData = { ...currentOnboarding, ...updateData };
      
      // Woche automatisch erhöhen
      if (mergedData.week === 1 && 
          mergedData.w1_kickoff && mergedData.w1_requirements && mergedData.w1_configPlan) {
        updateData.week = 2;
      }
      if (mergedData.week === 2 &&
          mergedData.w2_domain && mergedData.w2_database && mergedData.w2_appSetup && mergedData.w2_dataImport) {
        updateData.week = 3;
      }
      if (mergedData.week === 3 &&
          mergedData.w3_adminTraining && mergedData.w3_workerTraining && mergedData.w3_testRun) {
        updateData.week = 4;
      }

      // Automatisch auf "completed" setzen wenn alles erledigt
      if (mergedData.w4_goLive && mergedData.w4_supportHandover && mergedData.status !== "completed") {
        updateData.status = "completed";
        updateData.actualGoLive = new Date();
      }
    }

    const onboarding = await prisma.customerOnboarding.update({
      where: { id },
      data: updateData,
    });

    // ActivityLog für wichtige Änderungen
    const importantChanges = ["status", "w4_goLive", "contractSigned", "avvSigned"];
    const changedImportant = importantChanges.filter(k => body[k] !== undefined);
    
    if (changedImportant.length > 0) {
      await prisma.activityLog.create({
        data: {
          action: "ONBOARDING_UPDATED",
          entityType: "customer_onboarding",
          entityId: onboarding.id,
          entityName: onboarding.tenantName,
          userId: user.id,
          userEmail: user.email || undefined,
          metadata: JSON.stringify({ changedFields: changedImportant }),
        },
      });
    }

    return NextResponse.json({ onboarding });
  } catch (err: any) {
    console.error("[Onboarding API] PATCH Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getSessionOrApiKey(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const onboarding = await prisma.customerOnboarding.findUnique({
      where: { id },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Onboarding nicht gefunden" }, { status: 404 });
    }

    await prisma.customerOnboarding.delete({
      where: { id },
    });

    // ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "ONBOARDING_DELETED",
        entityType: "customer_onboarding",
        entityId: id,
        entityName: onboarding.tenantName,
        userId: user.id,
        userEmail: user.email || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Onboarding API] DELETE Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
