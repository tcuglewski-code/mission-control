import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { calcCost, logAiUsage } from "@/lib/ai-usage";

/**
 * GET /api/ai/usage
 * Query-Params:
 * - period: "7d" | "30d" | "90d" | "all" (default: 30d)
 * - projectId: optional
 * - source: "api" | "max" | "all" (default: all)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const projectId = searchParams.get("projectId");
    const source = searchParams.get("source") || "all";

    // Calculate date filter
    let dateFilter: Date | null = null;
    if (period !== "all") {
      const days = parseInt(period.replace("d", ""), 10) || 30;
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (dateFilter) {
      where.createdAt = { gte: dateFilter };
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (source !== "all") {
      where.source = source;
    }

    // Fetch all matching records
    const usageRecords = await prisma.aiUsage.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Calculate totals
    const totalTokens = usageRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCostUsd = usageRecords.reduce((sum, r) => sum + r.costUsd, 0);

    // Group by feature
    const byFeatureMap = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const r of usageRecords) {
      const existing = byFeatureMap.get(r.feature) || { tokens: 0, cost: 0, calls: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.costUsd;
      existing.calls += 1;
      byFeatureMap.set(r.feature, existing);
    }
    const byFeature = Array.from(byFeatureMap.entries()).map(([feature, data]) => ({
      feature,
      ...data,
    }));

    // Group by model
    const byModelMap = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const r of usageRecords) {
      const existing = byModelMap.get(r.model) || { tokens: 0, cost: 0, calls: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.costUsd;
      existing.calls += 1;
      byModelMap.set(r.model, existing);
    }
    const byModel = Array.from(byModelMap.entries()).map(([model, data]) => ({
      model,
      ...data,
    }));

    // Group by project
    const projectIds = [...new Set(usageRecords.filter(r => r.projectId).map(r => r.projectId!))];
    const projects = projectIds.length > 0 
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true },
        })
      : [];
    const projectNameMap = new Map(projects.map(p => [p.id, p.name]));

    const byProjectMap = new Map<string, { tokens: number; cost: number }>();
    for (const r of usageRecords) {
      if (r.projectId) {
        const existing = byProjectMap.get(r.projectId) || { tokens: 0, cost: 0 };
        existing.tokens += r.totalTokens;
        existing.cost += r.costUsd;
        byProjectMap.set(r.projectId, existing);
      }
    }
    const byProject = Array.from(byProjectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: projectNameMap.get(projectId) || "Unbekannt",
      ...data,
    }));

    // Group by day (for chart)
    const byDayMap = new Map<string, { tokens: number; cost: number }>();
    for (const r of usageRecords) {
      const date = new Date(r.createdAt).toISOString().split("T")[0];
      const existing = byDayMap.get(date) || { tokens: 0, cost: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.costUsd;
      byDayMap.set(date, existing);
    }
    const byDay = Array.from(byDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by source
    const apiRecords = usageRecords.filter(r => r.source === "api");
    const maxRecords = usageRecords.filter(r => r.source === "max");
    const bySource = {
      api: {
        tokens: apiRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        cost: apiRecords.reduce((sum, r) => sum + r.costUsd, 0),
      },
      max: {
        tokens: maxRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        cost: maxRecords.reduce((sum, r) => sum + r.costUsd, 0),
      },
    };

    return NextResponse.json({
      totalTokens,
      totalCostUsd,
      byFeature,
      byModel,
      byProject,
      byDay,
      bySource,
    });
  } catch (error: any) {
    console.error("[GET /api/ai/usage]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/usage
 * Für externe Logs (Amadeus/OpenClaw)
 * Auth: Header x-amadeus-token = process.env.AMADEUS_TOKEN (falls gesetzt)
 */
export async function POST(req: NextRequest) {
  try {
    // Check auth
    const amadeusToken = process.env.AMADEUS_TOKEN;
    if (amadeusToken) {
      const providedToken = req.headers.get("x-amadeus-token");
      if (providedToken !== amadeusToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { source, feature, model, inputTokens, outputTokens, projectId, taskId, sprintId, metadata } = body;

    // Validate required fields
    if (!source || !feature || !model || typeof inputTokens !== "number" || typeof outputTokens !== "number") {
      return NextResponse.json(
        { error: "source, feature, model, inputTokens, outputTokens sind erforderlich" },
        { status: 400 }
      );
    }

    await logAiUsage({
      source,
      feature,
      model,
      inputTokens,
      outputTokens,
      projectId,
      taskId,
      sprintId,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/ai/usage]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
