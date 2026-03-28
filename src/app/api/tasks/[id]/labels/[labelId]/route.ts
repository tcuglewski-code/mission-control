import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// DELETE /api/tasks/[id]/labels/[labelId] — Label von Task entfernen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId, labelId } = await params;

    await prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[id]/labels/[labelId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
