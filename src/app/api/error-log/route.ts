import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/error-log — Fehler-Protokoll abrufen
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const logs = await prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[GET /api/error-log]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/error-log — Alle Fehler löschen
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.errorLog.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/error-log]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
