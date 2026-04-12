/**
 * Monitoring API Route (AF012)
 * 
 * GET: Dashboard-Daten (aktuelle Status, Historie, Statistiken)
 * POST: Neue Monitoring-Config hinzufügen
 * PATCH: Config aktualisieren
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const session = await getSessionOrApiKey(request);
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    // Alle Configs laden
    const configs = await prisma.monitoringConfig.findMany({
      orderBy: { tenantName: "asc" },
    });

    // Aktuelle Status (letzte Checks)
    const latestChecks = await prisma.uptimeCheck.findMany({
      where: {
        tenantId: { in: configs.map((c) => c.tenantId) },
      },
      orderBy: { checkedAt: "desc" },
      take: configs.length * 10, // Letzte 10 pro Tenant
    });

    // Gruppiere nach Tenant
    const checksByTenant: Record<string, typeof latestChecks> = {};
    for (const check of latestChecks) {
      if (!checksByTenant[check.tenantId]) {
        checksByTenant[check.tenantId] = [];
      }
      if (checksByTenant[check.tenantId].length < 10) {
        checksByTenant[check.tenantId].push(check);
      }
    }

    // Statistiken berechnen (letzte 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChecks = await prisma.uptimeCheck.findMany({
      where: { checkedAt: { gte: twentyFourHoursAgo } },
    });

    const stats = {
      totalChecks24h: recentChecks.length,
      successfulChecks24h: recentChecks.filter((c) => c.status === "up").length,
      failedChecks24h: recentChecks.filter((c) => c.status !== "up").length,
      uptime24h: recentChecks.length > 0
        ? Math.round((recentChecks.filter((c) => c.status === "up").length / recentChecks.length) * 10000) / 100
        : 100,
      avgResponseTime24h: recentChecks.filter((c) => c.responseTime).length > 0
        ? Math.round(
            recentChecks.filter((c) => c.responseTime).reduce((sum, c) => sum + (c.responseTime ?? 0), 0) /
            recentChecks.filter((c) => c.responseTime).length
          )
        : 0,
    };

    // Uptime pro Tenant (letzte 24h)
    const uptimeByTenant: Record<string, number> = {};
    for (const config of configs) {
      const tenantChecks = recentChecks.filter((c) => c.tenantId === config.tenantId);
      if (tenantChecks.length > 0) {
        uptimeByTenant[config.tenantId] = 
          Math.round((tenantChecks.filter((c) => c.status === "up").length / tenantChecks.length) * 10000) / 100;
      } else {
        uptimeByTenant[config.tenantId] = 100;
      }
    }

    // Response für Dashboard
    const tenants = configs.map((config) => ({
      id: config.id,
      tenantId: config.tenantId,
      tenantName: config.tenantName,
      url: config.url,
      enabled: config.enabled,
      timeout: config.timeout,
      alertOnDown: config.alertOnDown,
      lastStatus: config.lastStatus,
      lastCheckedAt: config.lastCheckedAt,
      consecutiveFails: config.consecutiveFails,
      uptime24h: uptimeByTenant[config.tenantId] ?? 100,
      recentChecks: checksByTenant[config.tenantId] ?? [],
    }));

    return NextResponse.json({
      tenants,
      stats,
      telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    });
  } catch (err: any) {
    console.error("[Monitoring API] Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionOrApiKey(request);
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Admin-Check
  const user = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Nur Admins können Monitoring-Configs erstellen" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tenantId, tenantName, url, timeout = 10, alertOnDown = true } = body;

    if (!tenantId || !tenantName || !url) {
      return NextResponse.json({ error: "tenantId, tenantName und url sind Pflichtfelder" }, { status: 400 });
    }

    const config = await prisma.monitoringConfig.create({
      data: {
        tenantId,
        tenantName,
        url,
        timeout,
        alertOnDown,
        enabled: true,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (err: any) {
    console.error("[Monitoring API] POST Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionOrApiKey(request);
  if (!session) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Admin-Check
  const user = await prisma.authUser.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Nur Admins können Monitoring-Configs bearbeiten" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, enabled, timeout, alertOnDown, url, tenantName } = body;

    if (!id) {
      return NextResponse.json({ error: "id ist Pflichtfeld" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof enabled === "boolean") updateData.enabled = enabled;
    if (typeof timeout === "number") updateData.timeout = timeout;
    if (typeof alertOnDown === "boolean") updateData.alertOnDown = alertOnDown;
    if (url) updateData.url = url;
    if (tenantName) updateData.tenantName = tenantName;

    const config = await prisma.monitoringConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(config);
  } catch (err: any) {
    console.error("[Monitoring API] PATCH Fehler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
