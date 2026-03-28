import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

const DEFAULT_LABELS = [
  { name: "Bug", color: "#ef4444" },
  { name: "Feature", color: "#3b82f6" },
  { name: "Dringend", color: "#f97316" },
  { name: "Review", color: "#8b5cf6" },
  { name: "Dokumentation", color: "#10b981" },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await prisma.label.count();
    if (count === 0) {
      // Seed default labels
      await prisma.label.createMany({ data: DEFAULT_LABELS, skipDuplicates: true });
    }

    const labels = await prisma.label.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(labels);
  } catch (error) {
    console.error("[GET /api/labels]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color: color ?? "#6b7280",
      },
    });
    return NextResponse.json(label, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Label already exists" }, { status: 409 });
    }
    console.error("[POST /api/labels]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.label.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/labels]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
