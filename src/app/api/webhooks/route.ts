import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
