import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/notifications — eigene Benachrichtigungen (mit optionalem Cursor-Pagination)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const cursor = searchParams.get("cursor"); // ID der letzten Notification (für Pagination)
    const onlyUnread = searchParams.get("unread") === "true";

    const where = {
      userId: user.id,
      ...(onlyUnread ? { read: false } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 um zu prüfen ob es mehr gibt
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({ notifications: items, unreadCount, hasMore, nextCursor });
  } catch (error) {
    console.error("[notifications] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
