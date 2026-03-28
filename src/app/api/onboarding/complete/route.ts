import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * PATCH /api/onboarding/complete
 * Setzt onboardingComplete = true für den aktuellen Benutzer.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const updated = await prisma.authUser.update({
      where: { id: session.id },
      data: { onboardingComplete: true },
    });

    return NextResponse.json({
      onboardingComplete: (updated as any).onboardingComplete ?? true,
      tourComplete: (updated as any).tourComplete ?? false,
    });
  } catch (e) {
    console.error("[onboarding/complete] PATCH error:", e);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
