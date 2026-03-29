import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";

// POST /api/projects/[id]/share/email — Sendet Projekt-Update per Email an Kunden
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { recipientEmail, recipientName, shareToken, updateMessage } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: "Empfänger-Email fehlt" }, { status: 400 });
    }
    if (!shareToken) {
      return NextResponse.json({ error: "Share-Token fehlt" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true, description: true, progress: true, status: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    const share = await prisma.projectShare.findUnique({ where: { token: shareToken } });
    if (!share || share.projectId !== id) {
      return NextResponse.json({ error: "Share-Link ungültig" }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://mission-control-tawny-omega.vercel.app";
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    const statusLabels: Record<string, string> = {
      active: "Aktiv",
      in_progress: "In Bearbeitung",
      completed: "Abgeschlossen",
      on_hold: "Pausiert",
      cancelled: "Abgebrochen",
    };

    const statusLabel = statusLabels[project.status] ?? project.status;
    const greeting = recipientName ? `Sehr geehrte/r ${recipientName},` : "Sehr geehrte Damen und Herren,";

    const emailHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projekt-Update – Koch Aufforstung GmbH</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; }
    .header { background: #16a34a; padding: 28px 32px; color: #fff; }
    .header .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header .subtitle { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 16px; }
    .message-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #15803d; }
    .project-card { border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .project-name { font-size: 17px; font-weight: 700; color: #18181b; }
    .project-desc { font-size: 13px; color: #71717a; margin-top: 4px; }
    .progress-bar { background: #e4e4e7; border-radius: 99px; height: 8px; margin: 12px 0 4px; overflow: hidden; }
    .progress-fill { background: #16a34a; height: 100%; border-radius: 99px; }
    .progress-label { font-size: 12px; color: #71717a; display: flex; justify-content: space-between; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #16a34a; margin-top: 8px; }
    .cta { display: block; background: #16a34a; color: #fff !important; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 24px 0 8px; }
    .footer { padding: 20px 32px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌲 Koch Aufforstung GmbH</div>
      <div class="subtitle">Projekt-Update</div>
    </div>
    <div class="body">
      <p class="greeting">${greeting}</p>
      <p style="font-size:14px;color:#3f3f46;line-height:1.6;">wir möchten Sie über den aktuellen Stand Ihres Projekts informieren.</p>
      ${updateMessage ? `<div class="message-box">${updateMessage.replace(/\n/g, "<br/>")}</div>` : ""}
      <div class="project-card">
        <div class="project-name">${project.name}</div>
        ${project.description ? `<div class="project-desc">${project.description}</div>` : ""}
        <div class="progress-bar"><div class="progress-fill" style="width:${project.progress}%"></div></div>
        <div class="progress-label"><span>Fortschritt</span><span>${project.progress}%</span></div>
        <span class="status-badge">${statusLabel}</span>
      </div>
      <a href="${shareUrl}" class="cta">Projektstatus ansehen →</a>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;">Oder kopieren Sie diesen Link: <br/><span style="color:#3f3f46">${shareUrl}</span></p>
    </div>
    <div class="footer">
      Koch Aufforstung GmbH · Diese E-Mail wurde automatisch generiert.<br/>
      Bei Fragen wenden Sie sich bitte direkt an Ihr Projektteam.
    </div>
  </div>
</body>
</html>`;

    // E-Mail senden via zentrale email.ts Library (graceful degradation eingebaut)
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Projekt-Update: ${project.name}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: result.success,
      method: result.method,
      messageId: result.messageId,
      error: result.error,
      html: result.html,
      to: result.to,
      subject: result.subject,
      shareUrl,
    });
  } catch (error) {
    console.error("[POST /api/projects/[id]/share/email]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
