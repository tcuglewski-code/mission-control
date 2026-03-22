import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Webhooks sind nur für Admins zugänglich (sensible Konfiguration)
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const webhooks = await prisma.webhook.findMany({
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("[GET /api/webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, url, secret, events, projectId, active } = body;

    if (!name || !url || !events?.length) {
      return NextResponse.json(
        { error: "name, url, and events are required" },
        { status: 400 }
      );
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret: secret || null,
        events,
        projectId: projectId || null,
        active: active ?? true,
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("[POST /api/webhooks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
