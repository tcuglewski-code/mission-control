import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// DELETE /api/notifications/delete-all — alle Benachrichtigungen löschen
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count } = await prisma.notification.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error("[DELETE /api/notifications/delete-all]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
