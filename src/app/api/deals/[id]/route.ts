import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/authHelpers";

// GET /api/deals/[id] — Einzelner Deal mit Activities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal nicht gefunden" }, { status: 404 });
  }

  const activities = await prisma.dealActivity.findMany({
    where: { dealId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ deal, activities });
}

// PATCH /api/deals/[id] — Deal aktualisieren
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const existingDeal = await prisma.deal.findUnique({ where: { id } });

    if (!existingDeal) {
      return NextResponse.json({ error: "Deal nicht gefunden" }, { status: 404 });
    }

    // Stage-Änderung tracken
    const oldStage = existingDeal.stage;
    const newStage = body.stage ?? oldStage;
    const stageChanged = oldStage !== newStage;

    // Spezielle Felder für Won/Lost
    const updateData: any = { ...body };
    if (body.nextActionDate) {
      updateData.nextActionDate = new Date(body.nextActionDate);
    }
    if (newStage === "closed-won" && !existingDeal.wonDate) {
      updateData.wonDate = new Date();
    }
    if (newStage === "closed-lost" && !existingDeal.lostDate) {
      updateData.lostDate = new Date();
    }

    // Probability automatisch anpassen bei Stage-Wechsel
    if (stageChanged) {
      const stageProbabilities: Record<string, number> = {
        prospect: 10,
        qualified: 25,
        demo: 50,
        proposal: 75,
        "closed-won": 100,
        "closed-lost": 0,
      };
      if (stageProbabilities[newStage] !== undefined) {
        updateData.probability = stageProbabilities[newStage];
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
    });

    // Activity Log für Stage-Änderung
    if (stageChanged) {
      await prisma.dealActivity.create({
        data: {
          dealId: id,
          type: "stage_change",
          content: `Stage geändert: ${oldStage} → ${newStage}`,
          authorName: auth.user?.name ?? "System",
          metadata: JSON.stringify({ oldStage, newStage }),
        },
      });
    }

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error("Error updating deal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/deals/[id] — Deal löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Zuerst Activities löschen
    await prisma.dealActivity.deleteMany({
      where: { dealId: id },
    });

    await prisma.deal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting deal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
