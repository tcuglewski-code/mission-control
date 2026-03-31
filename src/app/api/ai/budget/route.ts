import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey, requireAdminFromDb } from "@/lib/api-auth";

/**
 * GET /api/ai/budget
 * Gibt Budget-Konfiguration + aktuelle Statistiken zurück
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create config
    let config = await prisma.aiBudgetConfig.findUnique({
      where: { id: "singleton" },
    });

    if (!config) {
      config = await prisma.aiBudgetConfig.create({
        data: { id: "singleton" },
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get current usage
    const [dailyUsage, monthlyUsage] = await Promise.all([
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { costUsd: true, totalTokens: true },
        _count: true,
      }),
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, totalTokens: true },
        _count: true,
      }),
    ]);

    const dailyCost = dailyUsage._sum.costUsd || 0;
    const monthlyCost = monthlyUsage._sum.costUsd || 0;

    return NextResponse.json({
      config: {
        dailyBudgetUsd: config.dailyBudgetUsd,
        monthlyBudgetUsd: config.monthlyBudgetUsd,
        alertThreshold: config.alertThreshold,
        alertEnabled: config.alertEnabled,
        alertTelegram: config.alertTelegram,
        alertEmail: config.alertEmail,
        alertEmails: config.alertEmails,
      },
      current: {
        daily: {
          cost: dailyCost,
          budget: config.dailyBudgetUsd,
          percent: Math.round((dailyCost / config.dailyBudgetUsd) * 100),
          tokens: dailyUsage._sum.totalTokens || 0,
          calls: dailyUsage._count,
        },
        monthly: {
          cost: monthlyCost,
          budget: config.monthlyBudgetUsd,
          percent: Math.round((monthlyCost / config.monthlyBudgetUsd) * 100),
          tokens: monthlyUsage._sum.totalTokens || 0,
          calls: monthlyUsage._count,
        },
      },
      alerts: {
        dailyWarning: dailyCost >= config.dailyBudgetUsd * config.alertThreshold,
        monthlyWarning: monthlyCost >= config.monthlyBudgetUsd * config.alertThreshold,
        dailyExceeded: dailyCost >= config.dailyBudgetUsd,
        monthlyExceeded: monthlyCost >= config.monthlyBudgetUsd,
      },
      telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    });
  } catch (error) {
    console.error("[GET /api/ai/budget]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * PUT /api/ai/budget
 * Update Budget-Konfiguration (Admin only)
 */
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdminFromDb();
    if (!admin) {
      return NextResponse.json({ error: "Admin-Berechtigung erforderlich" }, { status: 403 });
    }

    const body = await req.json();
    const {
      dailyBudgetUsd,
      monthlyBudgetUsd,
      alertThreshold,
      alertEnabled,
      alertTelegram,
      alertEmail,
      alertEmails,
    } = body;

    // Validate
    if (dailyBudgetUsd !== undefined && (typeof dailyBudgetUsd !== "number" || dailyBudgetUsd < 0)) {
      return NextResponse.json({ error: "dailyBudgetUsd muss >= 0 sein" }, { status: 400 });
    }
    if (monthlyBudgetUsd !== undefined && (typeof monthlyBudgetUsd !== "number" || monthlyBudgetUsd < 0)) {
      return NextResponse.json({ error: "monthlyBudgetUsd muss >= 0 sein" }, { status: 400 });
    }
    if (alertThreshold !== undefined && (typeof alertThreshold !== "number" || alertThreshold < 0 || alertThreshold > 1)) {
      return NextResponse.json({ error: "alertThreshold muss zwischen 0 und 1 liegen" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (dailyBudgetUsd !== undefined) updateData.dailyBudgetUsd = dailyBudgetUsd;
    if (monthlyBudgetUsd !== undefined) updateData.monthlyBudgetUsd = monthlyBudgetUsd;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (alertEnabled !== undefined) updateData.alertEnabled = alertEnabled;
    if (alertTelegram !== undefined) updateData.alertTelegram = alertTelegram;
    if (alertEmail !== undefined) updateData.alertEmail = alertEmail;
    if (alertEmails !== undefined) updateData.alertEmails = alertEmails;

    const config = await prisma.aiBudgetConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...updateData },
      update: updateData,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[PUT /api/ai/budget]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
