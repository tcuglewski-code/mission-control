import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { buildDigestEmailHtml } from "@/app/api/digest/generate/route";

// GET /api/digest/preview — HTML-Vorschau des E-Mail-Digests für den aktuellen Benutzer
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = await prisma.authUser.findUnique({
      where: { id: user.id },
      include: {
        notifications: {
          where: { read: false },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!authUser) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://mission-control-tawny-omega.vercel.app";

    // Statistiken berechnen
    const notifByType: Record<string, number> = {};
    for (const n of authUser.notifications) {
      notifByType[n.type] = (notifByType[n.type] ?? 0) + 1;
    }

    const neueAufgaben = (notifByType["task_assigned"] ?? 0) + (notifByType["task_status_changed"] ?? 0) + (notifByType["task_update"] ?? 0);
    const faelligeAufgaben = (notifByType["deadline"] ?? 0) + (notifByType["milestone_due"] ?? 0);
    const neueKommentare = notifByType["comment_added"] ?? 0;

    const html = buildDigestEmailHtml({
      baseUrl,
      username: authUser.username,
      email: authUser.email ?? "",
      userId: authUser.id,
      notifications: authUser.notifications,
      neueAufgaben,
      faelligeAufgaben,
      neueKommentare,
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("[GET /api/digest/preview]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
