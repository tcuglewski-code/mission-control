import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// PATCH — Email aktualisieren (z.B. als gelesen markieren)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const email = await prisma.inboxEmail.update({
      where: { id: params.id },
      data: {
        ...(typeof body.read === "boolean" ? { read: body.read } : {}),
        ...(typeof body.taskCreated === "boolean" ? { taskCreated: body.taskCreated } : {}),
      },
      include: {
        tasks: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json(email);
  } catch (err) {
    console.error("[PATCH /api/inbox/emails/:id]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// DELETE — Email löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.inboxEmail.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/inbox/emails/:id]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
