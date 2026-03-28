import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// POST /api/invoices/bulk-paid
// Body: { ids: string[] }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Keine Rechnungen ausgewählt" }, { status: 400 });
    }

    const now = new Date();
    await prisma.invoice.updateMany({
      where: {
        id: { in: ids },
        status: { in: ["OPEN", "OVERDUE"] },
      },
      data: {
        status: "PAID",
        paidAt: now,
        paymentDate: now,
      },
    });

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err) {
    console.error("[POST /api/invoices/bulk-paid]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
