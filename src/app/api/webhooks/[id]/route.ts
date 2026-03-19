import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, url, secret, events, projectId, active } = body;

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(secret !== undefined && { secret: secret || null }),
        ...(events !== undefined && { events }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(active !== undefined && { active }),
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("[PATCH /api/webhooks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.webhookLog.deleteMany({ where: { webhookId: id } });
    await prisma.webhook.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/webhooks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
