import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/invoice-templates
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const templates = await prisma.invoiceTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      templates.map((t) => ({
        ...t,
        positions: JSON.parse(t.positions),
      }))
    );
  } catch (err) {
    console.error("[GET /api/invoice-templates]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/invoice-templates
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, description, positions } = body;

    if (!name) return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    if (!positions || !Array.isArray(positions) || positions.length === 0)
      return NextResponse.json({ error: "Mindestens eine Position erforderlich" }, { status: 400 });

    const template = await prisma.invoiceTemplate.create({
      data: {
        name,
        description: description ?? null,
        positions: JSON.stringify(positions),
      },
    });

    return NextResponse.json({ ...template, positions }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoice-templates]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
