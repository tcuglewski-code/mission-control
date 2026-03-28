import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/quotes
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const quotes = await prisma.quote.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (err) {
    console.error("[GET /api/quotes]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/quotes
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { number, projectId, clientId, clientName, clientEmail, title, items, validUntil, status, note } = body;

    if (!number) return NextResponse.json({ error: "Angebotsnummer ist erforderlich" }, { status: 400 });
    if (!clientName) return NextResponse.json({ error: "Kundenname ist erforderlich" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
    if (!validUntil) return NextResponse.json({ error: "Gültig bis ist erforderlich" }, { status: 400 });

    // Brutto-Betrag berechnen
    let amount = 0;
    if (items && Array.isArray(items)) {
      amount = items.reduce((sum: number, item: { quantity: number; unitPrice: number; vatRate: number }) => {
        const netto = item.quantity * item.unitPrice;
        return sum + netto + netto * (item.vatRate / 100);
      }, 0);
    }

    const quote = await prisma.quote.create({
      data: {
        number,
        projectId: projectId || null,
        clientId: clientId || null,
        clientName,
        clientEmail: clientEmail || null,
        title,
        items: items || [],
        validUntil: new Date(validUntil),
        status: status ?? "draft",
        note: note || null,
        amount,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quotes]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
