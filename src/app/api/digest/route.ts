import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/digest — Archiv aller Digests
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "30", 10);

    const digests = await prisma.dailyDigest.findMany({
      orderBy: { datum: "desc" },
      take: Math.min(limit, 90),
    });

    return NextResponse.json(digests);
  } catch (error) {
    console.error("[GET /api/digest]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
