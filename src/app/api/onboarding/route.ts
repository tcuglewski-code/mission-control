import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * GET /api/onboarding
 * Gibt den aktuellen Onboarding-Status zurück.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const user = await prisma.authUser.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    onboardingComplete: (user as any).onboardingComplete ?? false,
    tourComplete: (user as any).tourComplete ?? false,
  });
}

/**
 * PATCH /api/onboarding
 * Setzt onboardingComplete und/oder tourComplete.
 * Body: { onboardingComplete?: boolean, tourComplete?: boolean }
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.onboardingComplete !== undefined) {
    updateData.onboardingComplete = Boolean(body.onboardingComplete);
  }
  if (body.tourComplete !== undefined) {
    updateData.tourComplete = Boolean(body.tourComplete);
  }

  try {
    const updated = await prisma.authUser.update({
      where: { id: session.id },
      data: updateData,
    });

    return NextResponse.json({
      onboardingComplete: (updated as any).onboardingComplete ?? false,
      tourComplete: (updated as any).tourComplete ?? false,
    });
  } catch (e) {
    console.error("[onboarding] PATCH error:", e);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
