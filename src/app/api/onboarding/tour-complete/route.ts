import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * PATCH /api/onboarding/tour-complete
 * Setzt tourComplete = true für den aktuellen Benutzer.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const updated = await prisma.authUser.update({
      where: { id: session.id },
      data: { tourComplete: true },
    });

    return NextResponse.json({
      onboardingComplete: (updated as any).onboardingComplete ?? false,
      tourComplete: (updated as any).tourComplete ?? true,
    });
  } catch (e) {
    console.error("[onboarding/tour-complete] PATCH error:", e);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
