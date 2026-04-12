import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ type: string }> };

// GET /api/integrations/[type]
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await params;
    const integration = await prisma.integrationConfig.findUnique({ where: { type } });

    if (!integration) {
      return NextResponse.json({ type, enabled: false, status: "inactive", config: {} });
    }

    return NextResponse.json({
      ...integration,
      config: (() => { try { return JSON.parse(integration.config); } catch { return {}; } })(),
    });
  } catch (err) {
    console.error("[GET /api/integrations/[type]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// PATCH /api/integrations/[type]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await params;
    const body = await req.json();
    const { name, config, enabled, status } = body;

    const integration = await prisma.integrationConfig.upsert({
      where: { type },
      update: {
        ...(name !== undefined && { name }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(enabled !== undefined && { enabled }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      },
      create: {
        type,
        name: name ?? type,
        config: JSON.stringify(config ?? {}),
        enabled: enabled ?? false,
        status: status ?? "inactive",
      },
    });

    return NextResponse.json({
      ...integration,
      config: (() => { try { return JSON.parse(integration.config); } catch { return {}; } })(),
    });
  } catch (err) {
    console.error("[PATCH /api/integrations/[type]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// DELETE /api/integrations/[type]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await params;

    await prisma.integrationConfig.deleteMany({ where: { type } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/integrations/[type]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
