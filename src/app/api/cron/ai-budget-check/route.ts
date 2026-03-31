import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * POST /api/cron/ai-budget-check
 * Vercel Cron: täglich 08:00 + 20:00 UTC
 * Prüft AI-Kosten gegen Budget und sendet Alerts
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // Get or create budget config
    let config = await prisma.aiBudgetConfig.findUnique({
      where: { id: "singleton" },
    });

    if (!config) {
      config = await prisma.aiBudgetConfig.create({
        data: { id: "singleton" },
      });
    }

    if (!config.alertEnabled) {
      return NextResponse.json({ message: "Alerts deaktiviert", skipped: true });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate daily costs
    const dailyUsage = await prisma.aiUsage.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { costUsd: true, totalTokens: true },
      _count: true,
    });

    // Aggregate monthly costs
    const monthlyUsage = await prisma.aiUsage.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costUsd: true, totalTokens: true },
      _count: true,
    });

    const dailyCost = dailyUsage._sum.costUsd || 0;
    const monthlyCost = monthlyUsage._sum.costUsd || 0;
    const dailyTokens = dailyUsage._sum.totalTokens || 0;
    const monthlyTokens = monthlyUsage._sum.totalTokens || 0;

    const dailyPercent = (dailyCost / config.dailyBudgetUsd) * 100;
    const monthlyPercent = (monthlyCost / config.monthlyBudgetUsd) * 100;
    const thresholdPercent = config.alertThreshold * 100;

    const alerts: string[] = [];
    const updates: Record<string, Date> = {};

    // Check daily budget
    if (dailyPercent >= thresholdPercent) {
      const lastDailyAlert = config.lastDailyAlertAt;
      const shouldAlert = !lastDailyAlert || 
        lastDailyAlert.toDateString() !== now.toDateString();

      if (shouldAlert) {
        alerts.push(
          `🔴 *Tages-Budget-Warnung*\n` +
          `Kosten: $${dailyCost.toFixed(2)} / $${config.dailyBudgetUsd.toFixed(2)} (${dailyPercent.toFixed(0)}%)\n` +
          `Tokens: ${formatTokens(dailyTokens)}\n` +
          `Calls: ${dailyUsage._count}`
        );
        updates.lastDailyAlertAt = now;
      }
    }

    // Check monthly budget
    if (monthlyPercent >= thresholdPercent) {
      const lastMonthlyAlert = config.lastMonthlyAlertAt;
      const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
      const lastAlertMonth = lastMonthlyAlert 
        ? `${lastMonthlyAlert.getFullYear()}-${lastMonthlyAlert.getMonth()}`
        : null;
      const shouldAlert = lastAlertMonth !== currentMonth;

      if (shouldAlert) {
        alerts.push(
          `🟠 *Monats-Budget-Warnung*\n` +
          `Kosten: $${monthlyCost.toFixed(2)} / $${config.monthlyBudgetUsd.toFixed(2)} (${monthlyPercent.toFixed(0)}%)\n` +
          `Tokens: ${formatTokens(monthlyTokens)}\n` +
          `Calls: ${monthlyUsage._count}`
        );
        updates.lastMonthlyAlertAt = now;
      }
    }

    // Send Telegram alerts
    if (alerts.length > 0 && config.alertTelegram) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId) {
        const message = `🤖 *Mission Control KI-Budget Alert*\n\n${alerts.join("\n\n")}`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
      }
    }

    // Update last alert timestamps
    if (Object.keys(updates).length > 0) {
      await prisma.aiBudgetConfig.update({
        where: { id: "singleton" },
        data: updates,
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "AI_BUDGET_CHECK",
        entityType: "system",
        entityId: "ai-budget",
        entityName: "AI Budget Check",
        details: {
          dailyCost,
          monthlyCost,
          dailyPercent: Math.round(dailyPercent),
          monthlyPercent: Math.round(monthlyPercent),
          alertsSent: alerts.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      daily: {
        cost: dailyCost,
        budget: config.dailyBudgetUsd,
        percent: Math.round(dailyPercent),
        tokens: dailyTokens,
        calls: dailyUsage._count,
      },
      monthly: {
        cost: monthlyCost,
        budget: config.monthlyBudgetUsd,
        percent: Math.round(monthlyPercent),
        tokens: monthlyTokens,
        calls: monthlyUsage._count,
      },
      alertsSent: alerts.length,
    });
  } catch (error) {
    console.error("[ai-budget-check]", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toString();
}
