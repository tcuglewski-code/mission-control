import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/invoices/next-number
// Returns the next invoice number e.g. RE-2026-042
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const year = new Date().getFullYear();
    const prefix = `RE-${year}-`;

    // Höchste Rechnungsnummer für dieses Jahr finden
    const existing = await prisma.invoice.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
      orderBy: { number: "desc" },
    });

    let nextSeq = 1;
    if (existing.length > 0) {
      const nums = existing
        .map((inv) => parseInt(inv.number.replace(prefix, ""), 10))
        .filter((n) => !isNaN(n));
      if (nums.length > 0) {
        nextSeq = Math.max(...nums) + 1;
      }
    }

    const number = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    return NextResponse.json({ number });
  } catch (err) {
    console.error("[GET /api/invoices/next-number]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
