import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/auth-helpers";

/**
 * GET /api/ai/roi
 * Dashboard-Daten für ROI Tracking
 */
export async function GET(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30d";
  
  // Zeitraum berechnen
  const now = new Date();
  let startDate = new Date();
  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "all":
      startDate = new Date(0);
      break;
  }

  // Alle ROI Records im Zeitraum
  const records = await prisma.agentTaskRoi.findMany({
    where: {
      completedAt: { gte: startDate },
    },
    orderBy: { completedAt: "desc" },
  });

  // Summary berechnen
  const totalTasks = records.length;
  const totalManualHours = records.reduce((sum, r) => sum + r.estimatedManualHours, 0);
  const totalAgentMinutes = records.reduce((sum, r) => sum + r.actualAgentMinutes, 0);
  const totalAgentHours = totalAgentMinutes / 60;
  const totalSavedHours = totalManualHours - totalAgentHours;
  const totalCostUsd = records.reduce((sum, r) => sum + r.costUsd, 0);
  
  // Durchschnittlicher Stundensatz aus Records
  const avgHourlyRate = records.length > 0 
    ? records.reduce((sum, r) => sum + r.hourlyRateSaved, 0) / records.length 
    : 75;
  const totalSavedEur = totalSavedHours * avgHourlyRate;
  
  // ROI Berechnung: (Einsparung - Kosten) / Kosten * 100
  // Kosten in EUR (Annahme 1 USD = 0.92 EUR)
  const totalCostEur = totalCostUsd * 0.92;
  const roiPercent = totalCostEur > 0 ? ((totalSavedEur - totalCostEur) / totalCostEur) * 100 : 0;
  
  // Effizienzfaktor: wie viel schneller ist der Agent vs. Mensch
  const efficiencyFactor = totalAgentHours > 0 ? totalManualHours / totalAgentHours : 0;

  // Nach Kategorie aggregieren
  const byCategory: Record<string, { tasks: number; savedHours: number; costUsd: number; agentMinutes: number }> = {};
  for (const r of records) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { tasks: 0, savedHours: 0, costUsd: 0, agentMinutes: 0 };
    }
    byCategory[r.category].tasks++;
    byCategory[r.category].savedHours += r.savedHours || (r.estimatedManualHours - r.actualAgentMinutes / 60);
    byCategory[r.category].costUsd += r.costUsd;
    byCategory[r.category].agentMinutes += r.actualAgentMinutes;
  }

  // Nach Agent aggregieren
  const byAgent: Record<string, { tasks: number; savedHours: number; costUsd: number; agentMinutes: number }> = {};
  for (const r of records) {
    if (!byAgent[r.agentName]) {
      byAgent[r.agentName] = { tasks: 0, savedHours: 0, costUsd: 0, agentMinutes: 0 };
    }
    byAgent[r.agentName].tasks++;
    byAgent[r.agentName].savedHours += r.savedHours || (r.estimatedManualHours - r.actualAgentMinutes / 60);
    byAgent[r.agentName].costUsd += r.costUsd;
    byAgent[r.agentName].agentMinutes += r.actualAgentMinutes;
  }

  // Nach Tag aggregieren (letzte 30 Tage)
  const byDay: Array<{ date: string; tasks: number; savedHours: number; costUsd: number }> = [];
  const dayMap: Record<string, { tasks: number; savedHours: number; costUsd: number }> = {};
  for (const r of records) {
    const dateKey = r.completedAt.toISOString().slice(0, 10);
    if (!dayMap[dateKey]) {
      dayMap[dateKey] = { tasks: 0, savedHours: 0, costUsd: 0 };
    }
    dayMap[dateKey].tasks++;
    dayMap[dateKey].savedHours += r.savedHours || (r.estimatedManualHours - r.actualAgentMinutes / 60);
    dayMap[dateKey].costUsd += r.costUsd;
  }
  Object.keys(dayMap).sort().forEach(date => {
    byDay.push({ date, ...dayMap[date] });
  });

  // Nach Projekt aggregieren
  const byProject: Array<{ projectId: string; projectName: string; tasks: number; savedHours: number; costUsd: number }> = [];
  const projectMap: Record<string, { projectName: string; tasks: number; savedHours: number; costUsd: number }> = {};
  for (const r of records) {
    const projKey = r.projectId || "no-project";
    if (!projectMap[projKey]) {
      projectMap[projKey] = { projectName: r.projectName || "Ohne Projekt", tasks: 0, savedHours: 0, costUsd: 0 };
    }
    projectMap[projKey].tasks++;
    projectMap[projKey].savedHours += r.savedHours || (r.estimatedManualHours - r.actualAgentMinutes / 60);
    projectMap[projKey].costUsd += r.costUsd;
  }
  Object.keys(projectMap).forEach(projectId => {
    byProject.push({ projectId, ...projectMap[projectId] });
  });

  return NextResponse.json({
    summary: {
      totalTasks,
      totalManualHours: Math.round(totalManualHours * 10) / 10,
      totalAgentHours: Math.round(totalAgentHours * 10) / 10,
      totalSavedHours: Math.round(totalSavedHours * 10) / 10,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      totalCostEur: Math.round(totalCostEur * 100) / 100,
      totalSavedEur: Math.round(totalSavedEur),
      roiPercent: Math.round(roiPercent),
      efficiencyFactor: Math.round(efficiencyFactor * 10) / 10,
      avgHourlyRate,
    },
    byCategory: Object.entries(byCategory).map(([category, data]) => ({
      category,
      ...data,
      savedHours: Math.round(data.savedHours * 10) / 10,
    })),
    byAgent: Object.entries(byAgent).map(([agentName, data]) => ({
      agentName,
      ...data,
      savedHours: Math.round(data.savedHours * 10) / 10,
    })),
    byDay,
    byProject: byProject.sort((a, b) => b.savedHours - a.savedHours),
    recentTasks: records.slice(0, 20).map(r => ({
      id: r.id,
      taskTitle: r.taskTitle,
      category: r.category,
      agentName: r.agentName,
      estimatedManualHours: r.estimatedManualHours,
      actualAgentMinutes: r.actualAgentMinutes,
      savedHours: Math.round((r.savedHours || (r.estimatedManualHours - r.actualAgentMinutes / 60)) * 10) / 10,
      costUsd: r.costUsd,
      projectName: r.projectName,
      completedAt: r.completedAt,
    })),
  });
}

/**
 * POST /api/ai/roi
 * Neuen ROI-Record erstellen
 */
export async function POST(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    taskTitle,
    taskDescription,
    category = "other",
    agentName = "Amadeus",
    estimatedManualHours,
    actualAgentMinutes,
    costUsd = 0,
    hourlyRateSaved = 75,
    projectId,
    projectName,
    notes,
    completedAt,
  } = body;

  if (!taskTitle || estimatedManualHours === undefined || actualAgentMinutes === undefined) {
    return NextResponse.json(
      { error: "taskTitle, estimatedManualHours, actualAgentMinutes sind Pflichtfelder" },
      { status: 400 }
    );
  }

  const savedHours = estimatedManualHours - actualAgentMinutes / 60;

  const record = await prisma.agentTaskRoi.create({
    data: {
      taskTitle,
      taskDescription,
      category,
      agentName,
      estimatedManualHours: parseFloat(estimatedManualHours),
      actualAgentMinutes: parseFloat(actualAgentMinutes),
      costUsd: parseFloat(costUsd) || 0,
      savedHours,
      hourlyRateSaved: parseFloat(hourlyRateSaved) || 75,
      projectId,
      projectName,
      notes,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
    },
  });

  return NextResponse.json(record, { status: 201 });
}
