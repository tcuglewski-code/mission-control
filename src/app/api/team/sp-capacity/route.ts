import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Liefert historische Story-Points-Velocity pro Teammitglied
// basierend auf abgeschlossenen Sprints.
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, avatar: true, weeklyCapacity: true },
      orderBy: { name: "asc" },
    });

    // Alle abgeschlossenen Sprints mit Tasks (inkl. Story Points und Assignee)
    const completedSprints = await prisma.sprint.findMany({
      where: { status: "completed" },
      select: {
        id: true,
        name: true,
        tasks: {
          where: { status: "done" },
          select: {
            id: true,
            assigneeId: true,
            storyPoints: true,
          },
        },
      },
    });

    // Velocity pro User berechnen
    const velocityMap: Record<string, number[]> = {};

    for (const sprint of completedSprints) {
      // Aggregiere SP pro Assignee in diesem Sprint
      const spPerUser: Record<string, number> = {};
      for (const task of sprint.tasks) {
        if (!task.assigneeId) continue;
        spPerUser[task.assigneeId] = (spPerUser[task.assigneeId] ?? 0) + (task.storyPoints ?? 0);
      }
      for (const [userId, sp] of Object.entries(spPerUser)) {
        if (!velocityMap[userId]) velocityMap[userId] = [];
        velocityMap[userId].push(sp);
      }
    }

    const userStats = users.map((u) => {
      const velocities = velocityMap[u.id] ?? [];
      const avgVelocity = velocities.length > 0
        ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
        : 0;
      const maxVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;
      // Empfehlung: 85% der Durchschnitts-Velocity (mit Puffer)
      const recommended = Math.round(avgVelocity * 0.85) || Math.round((u.weeklyCapacity / 2) * 0.85);

      return {
        userId: u.id,
        userName: u.name,
        avgVelocity,
        maxVelocity,
        sprintCount: velocities.length,
        recommended,
      };
    });

    const teamTotal = userStats.reduce((a, u) => a + u.avgVelocity, 0);
    const activeUsers = userStats.filter((u) => u.avgVelocity > 0);
    const teamAvg = activeUsers.length > 0
      ? Math.round(teamTotal / activeUsers.length)
      : 0;

    return NextResponse.json({ users: userStats, teamTotal, teamAvg });
  } catch (error) {
    console.error("[GET /api/team/sp-capacity]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
