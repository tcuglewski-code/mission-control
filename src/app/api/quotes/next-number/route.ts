import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/quotes/next-number
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const year = new Date().getFullYear();
    const prefix = `AN-${year}-`;

    const existing = await prisma.quote.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
      orderBy: { number: "desc" },
    });

    let nextSeq = 1;
    if (existing.length > 0) {
      const nums = existing
        .map((q) => parseInt(q.number.replace(prefix, ""), 10))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) nextSeq = Math.max(...nums) + 1;
    }

    const number = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    return NextResponse.json({ number });
  } catch (err) {
    console.error("[GET /api/quotes/next-number]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
