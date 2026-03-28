import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { createHash, randomBytes } from "crypto";

function sha256(data: string) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * GET /api/settings/profile/api-keys
 * Returns current user's API keys (without the actual key value).
 */
export async function GET(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
    }))
  );
}

/**
 * POST /api/settings/profile/api-keys
 * Create a new API key for the current user.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json();
  const { name, expiresAt } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });
  }

  // Generate key: mc_live_ + 64 random hex chars
  const rawKey = "mc_live_" + randomBytes(32).toString("hex");
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash,
      keyPrefix,
      userId: session.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(
    {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Only returned once!
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/settings/profile/api-keys?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
  }

  // Make sure the key belongs to the current user
  const key = await prisma.apiKey.findFirst({ where: { id, userId: session.id } });
  if (!key) {
    return NextResponse.json({ error: "API-Key nicht gefunden" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
