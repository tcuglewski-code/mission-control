import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/authHelpers";

// GET /api/deals — Liste aller Deals
export async function GET(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  const where: any = {};
  if (stage && stage !== "all") {
    where.stage = stage;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  const deals = await prisma.deal.findMany({
    where,
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });

  // Aggregationen für Pipeline-Übersicht
  const stageStats = await prisma.deal.groupBy({
    by: ["stage"],
    _count: { id: true },
    _sum: { value: true },
  });

  return NextResponse.json({ deals, stageStats });
}

// POST /api/deals — Neuen Deal erstellen
export async function POST(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      company,
      contactName,
      contactEmail,
      contactPhone,
      value,
      stage,
      probability,
      source,
      notes,
      industry,
      employees,
      nextAction,
      nextActionDate,
      ownerId,
      ownerName,
    } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: "Titel und Unternehmen sind erforderlich" },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        company,
        contactName,
        contactEmail,
        contactPhone,
        value: value ?? 0,
        stage: stage ?? "prospect",
        probability: probability ?? 10,
        source,
        notes,
        industry,
        employees,
        nextAction,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
        ownerId,
        ownerName,
      },
    });

    // Activity Log
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: "note",
        content: `Deal "${title}" erstellt`,
        authorName: auth.user?.name ?? "System",
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error: any) {
    console.error("Error creating deal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
