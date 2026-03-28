import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/quotes/stats
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const all = await prisma.quote.findMany({
      select: { status: true, amount: true },
    });

    const sent = all.filter((q) => q.status === "sent");
    const accepted = all.filter((q) => q.status === "accepted");
    const declined = all.filter((q) => q.status === "declined");

    const offeneAngebote = sent.length;
    const annahmerate =
      accepted.length + declined.length > 0
        ? Math.round((accepted.length / (accepted.length + declined.length)) * 100)
        : 0;

    const totalAmount = all.reduce((s, q) => s + q.amount, 0);
    const avgAmount = all.length > 0 ? totalAmount / all.length : 0;

    return NextResponse.json({
      offeneAngebote,
      annahmerate,
      avgAmount,
      totalCount: all.length,
      acceptedCount: accepted.length,
      declinedCount: declined.length,
      sentCount: sent.length,
    });
  } catch (err) {
    console.error("[GET /api/quotes/stats]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
