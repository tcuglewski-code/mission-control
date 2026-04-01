/**
 * Customer Onboarding API (AF083: Cleo-Agent)
 * 
 * GET  - Liste alle Onboardings
 * POST - Erstelle neues Onboarding
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getSessionOrApiKey(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const onboardings = await prisma.customerOnboarding.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { week: "asc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json({ onboardings });
  } catch (err: any) {
    console.error("[Customer Onboarding API] GET Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getSessionOrApiKey(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, tenantName, contactName, contactEmail, targetGoLive, projectId, ownerName } = body;

    if (!tenantId || !tenantName) {
      return NextResponse.json(
        { error: "tenantId und tenantName sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfe ob tenantId schon existiert
    const existing = await prisma.customerOnboarding.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Onboarding für Tenant '${tenantId}' existiert bereits` },
        { status: 409 }
      );
    }

    // Berechne Standard-GoLive (4 Wochen ab heute)
    const defaultGoLive = new Date();
    defaultGoLive.setDate(defaultGoLive.getDate() + 28);

    const onboarding = await prisma.customerOnboarding.create({
      data: {
        tenantId,
        tenantName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        targetGoLive: targetGoLive ? new Date(targetGoLive) : defaultGoLive,
        projectId: projectId || null,
        ownerName: ownerName || user.name || null,
        status: "in_progress",
        week: 1,
      },
    });

    // ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "ONBOARDING_CREATED",
        entityType: "customer_onboarding",
        entityId: onboarding.id,
        entityName: tenantName,
        userId: user.id,
        userEmail: user.email || undefined,
      },
    });

    return NextResponse.json({ onboarding }, { status: 201 });
  } catch (err: any) {
    console.error("[Customer Onboarding API] POST Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
