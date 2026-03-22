import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sha256 } from "@/lib/api-auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        userId: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        // keyHash is intentionally excluded
      },
    });

    // Enrich with username
    const userIds = [...new Set(keys.map((k) => k.userId))];
    const users = await prisma.authUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

    const enriched = keys.map((k) => ({
      ...k,
      username: userMap[k.userId] ?? "unknown",
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[GET /api/admin/api-keys]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, userId, expiresAt } = body;

    if (!name || !userId) {
      return NextResponse.json({ error: "name and userId are required" }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.authUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate key: mc_live_ + 32 random hex bytes
    const rawSuffix = randomBytes(32).toString("hex");
    const rawKey = `mc_live_${rawSuffix}`;
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 16); // "mc_live_" + first 8 hex chars

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Return plaintext key ONCE — never stored in DB
    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        userId: apiKey.userId,
        username: user.username,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        // This is the only time we return the plaintext key!
        key: rawKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/api-keys]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
