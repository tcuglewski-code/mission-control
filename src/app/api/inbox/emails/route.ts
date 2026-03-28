import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET — Alle Emails aus dem Posteingang abrufen
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const emails = await prisma.inboxEmail.findMany({
      orderBy: { receivedAt: "desc" },
      include: {
        tasks: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json(emails);
  } catch (err) {
    console.error("[GET /api/inbox/emails]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST — Neue Email manuell hinzufügen (Simulation)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { from, subject, body: emailBody, preview, receivedAt } = body;

    if (!from || !subject) {
      return NextResponse.json(
        { error: "Felder 'from' und 'subject' sind Pflichtfelder" },
        { status: 400 }
      );
    }

    const email = await prisma.inboxEmail.create({
      data: {
        from,
        subject,
        body: emailBody ?? null,
        preview: preview ?? (emailBody ? emailBody.slice(0, 200) : null),
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        read: false,
        taskCreated: false,
      },
    });

    return NextResponse.json(email, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inbox/emails]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
