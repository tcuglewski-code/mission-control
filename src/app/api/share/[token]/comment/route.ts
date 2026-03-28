import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// POST /api/share/[token]/comment — Gast-Kommentar auf Share-Seite einreichen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.projectShare.findUnique({ where: { token } });
    if (!share) {
      return NextResponse.json({ error: "Link nicht gefunden" }, { status: 404 });
    }
    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link abgelaufen" }, { status: 410 });
    }

    const body = await req.json().catch(() => ({}));
    const { guestName, guestEmail, message, honeypot } = body;

    // Honeypot-Spam-Schutz: Wenn das versteckte Feld ausgefüllt ist → Spam
    if (honeypot && honeypot.trim() !== "") {
      // Stille Akzeptanz (kein Fehler, kein Kommentar)
      return NextResponse.json({ success: true });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Nachricht zu kurz (min. 5 Zeichen)" }, { status: 400 });
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Nachricht zu lang (max. 2000 Zeichen)" }, { status: 400 });
    }

    // Rate-Limiting: Max 5 Kommentare pro Share-Token in 1 Stunde
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.guestComment.count({
      where: {
        shareId: share.id,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentCount >= 5) {
      return NextResponse.json({ error: "Zu viele Kommentare. Bitte später versuchen." }, { status: 429 });
    }

    // Gast-Kommentar speichern
    const guestComment = await prisma.guestComment.create({
      data: {
        shareId: share.id,
        projectId: share.projectId,
        guestName: guestName?.trim() || null,
        guestEmail: guestEmail?.trim() || null,
        message: message.trim(),
      },
    });

    // Projekt laden für Kontext
    const project = await prisma.project.findUnique({
      where: { id: share.projectId },
      select: { name: true, tasks: { take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } },
    });

    // Als TaskComment im System speichern (am ersten Task des Projekts)
    if (project?.tasks?.[0]) {
      const authorDisplay = guestName?.trim() || guestEmail?.trim() || "Kunde (anonym)";
      const emailInfo = guestEmail?.trim() ? ` <${guestEmail.trim()}>` : "";
      await prisma.taskComment.create({
        data: {
          taskId: project.tasks[0].id,
          authorId: null,
          authorName: `${authorDisplay}${emailInfo}`,
          authorEmail: guestEmail?.trim() || null,
          content: `**Kunden-Kommentar via Share-Link**\n\n${message.trim()}`,
        },
      });
    }

    // Admin-Benachrichtigung senden
    const admins = await prisma.authUser.findMany({
      where: { role: "admin", active: true },
      select: { id: true },
    });

    const authorDisplay = guestName?.trim() || guestEmail?.trim() || "Anonym";
    const projectName = project?.name ?? "Unbekanntes Projekt";

    for (const admin of admins) {
      await createNotification(
        admin.id,
        "comment_added",
        `Neuer Kunden-Kommentar: ${projectName}`,
        `${authorDisplay} hat einen Kommentar zum Projekt "${projectName}" hinterlassen.`,
        `/share/${token}`
      );
    }

    return NextResponse.json({ success: true, id: guestComment.id });
  } catch (error) {
    console.error("[POST /api/share/[token]/comment]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
