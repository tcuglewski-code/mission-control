import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, type NotificationType } from "@/lib/notifications";

/**
 * POST /api/webhooks/email
 *
 * Empfängt eingehende E-Mails via Webhook (z.B. Mailgun, SendGrid Inbound Parse).
 * Erwartet Header: x-email-webhook-secret = EMAIL_WEBHOOK_SECRET
 *
 * Body:
 * {
 *   from: string,
 *   subject: string,
 *   body?: string,
 *   date?: string (ISO),
 * }
 */
export async function POST(req: NextRequest) {
  // ─── Secret-Validierung ──────────────────────────────────────────────────
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("x-email-webhook-secret");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const { from, subject, body: emailBody, date } = body;

    if (!from || !subject) {
      return NextResponse.json(
        { error: "Felder 'from' und 'subject' sind Pflichtfelder" },
        { status: 400 }
      );
    }

    const preview = emailBody ? String(emailBody).slice(0, 200) : undefined;

    // Email in DB speichern
    const email = await prisma.inboxEmail.create({
      data: {
        from: String(from),
        subject: String(subject),
        body: emailBody ? String(emailBody) : null,
        preview: preview ?? null,
        receivedAt: date ? new Date(date) : new Date(),
        read: false,
        taskCreated: false,
      },
    });

    // ─── Admin-Benachrichtigung ──────────────────────────────────────────────
    const admins = await prisma.authUser.findMany({
      where: { role: "admin", active: true },
      select: { id: true },
    });

    await Promise.allSettled(
      admins.map((admin) =>
        createNotification(
          admin.id,
          "new_email" as NotificationType,
          `📧 Neue E-Mail: ${subject}`,
          `Von: ${from}${preview ? ` — ${preview}` : ""}`,
          "/inbox"
        )
      )
    );

    // ─── Automatisch Task anlegen wenn Betreff [TASK] enthält ───────────────
    let autoTask = null;
    if (subject.includes("[TASK]")) {
      const taskTitle = subject.replace("[TASK]", "").trim();
      autoTask = await prisma.task.create({
        data: {
          title: taskTitle || subject,
          description: emailBody
            ? `**Aus E-Mail von ${from}:**\n\n${emailBody}`
            : `Automatisch erstellt aus E-Mail von ${from}`,
          status: "todo",
          priority: "medium",
          sourceEmailId: email.id,
        },
      });

      // Email als "Task erstellt" markieren
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: { taskCreated: true },
      });

      // Admin über Auto-Task informieren
      await Promise.allSettled(
        admins.map((admin) =>
          createNotification(
            admin.id,
            "task_assigned" as NotificationType,
            `🤖 Auto-Task erstellt: ${taskTitle}`,
            `Aus E-Mail [TASK] von ${from} automatisch als Task angelegt`,
            "/tasks"
          )
        )
      );
    }

    return NextResponse.json(
      { ok: true, email, autoTask },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/webhooks/email]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
