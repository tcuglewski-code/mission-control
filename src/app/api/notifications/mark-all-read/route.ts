import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// POST /api/notifications/mark-all-read — alle als gelesen markieren
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/notifications/mark-all-read]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
