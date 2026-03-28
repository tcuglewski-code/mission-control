import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/notifications/unsubscribe?email=...&token=...
// Deaktiviert den Email-Digest für einen Benutzer (Unsubscribe-Link)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return new NextResponse("Ungültiger Link", { status: 400 });
    }

    // Token = base64(userId)
    let userId: string;
    try {
      userId = Buffer.from(token, "base64").toString("utf-8");
    } catch {
      return new NextResponse("Ungültiger Token", { status: 400 });
    }

    const authUser = await prisma.authUser.findFirst({
      where: { id: userId, email },
    });

    if (!authUser) {
      return new NextResponse("Benutzer nicht gefunden", { status: 404 });
    }

    await prisma.authUser.update({
      where: { id: userId },
      data: { notifEmailDigest: false },
    });

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Abgemeldet</title></head>
<body style="font-family:sans-serif;background:#111;color:#eee;padding:40px;text-align:center;">
  <h1 style="color:#10b981;">✅ Erfolgreich abgemeldet</h1>
  <p>Du erhältst keine Email-Digests mehr von Mission Control.</p>
  <p><a href="${process.env.NEXTAUTH_URL ?? "https://mission-control-tawny-omega.vercel.app"}" style="color:#10b981;">Zurück zu Mission Control</a></p>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("[GET /api/notifications/unsubscribe]", error);
    return new NextResponse("Interner Serverfehler", { status: 500 });
  }
}
