import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [all, thisMonth] = await Promise.all([
      prisma.aiUsage.aggregate({
        _sum: { cost: true, totalTokens: true },
        _count: { id: true },
      }),
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { cost: true },
      }),
    ]);

    return NextResponse.json({
      totalCost: all._sum.cost ?? 0,
      totalTokens: all._sum.totalTokens ?? 0,
      callCount: all._count.id ?? 0,
      thisMonth: thisMonth._sum.cost ?? 0,
    });
  } catch {
    return NextResponse.json({
      totalCost: 0,
      totalTokens: 0,
      callCount: 0,
      thisMonth: 0,
    });
  }
}
