import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, getProjectMemberIds } from "@/lib/notifications";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { verifyCronAuth } from "@/lib/cron-auth";

// GET /api/notifications/milestone-check
// Vercel Cron: prüft täglich Meilensteine die in 3 Tagen fällig sind
export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: "Unauthorized — CRON_SECRET erforderlich" }, { status: 401 });
    }

    const in3Days = addDays(new Date(), 3);
    const dayStart = startOfDay(in3Days);
    const dayEnd = endOfDay(in3Days);

    // Meilensteine die in genau 3 Tagen fällig sind
    const milestones = await prisma.milestone.findMany({
      where: {
        dueDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["completed", "cancelled"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    let notifCount = 0;

    for (const milestone of milestones) {
      const memberIds = await getProjectMemberIds(milestone.projectId);
      for (const memberId of memberIds) {
        await createNotification(
          memberId,
          "milestone_due",
          "Meilenstein fällig in 3 Tagen",
          `Der Meilenstein „${milestone.title}" in Projekt „${milestone.project.name}" ist in 3 Tagen fällig.`,
          `/projects/${milestone.projectId}`
        );
        notifCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      milestonesChecked: milestones.length,
      notificationsCreated: notifCount,
    });
  } catch (error) {
    console.error("[GET /api/notifications/milestone-check]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
