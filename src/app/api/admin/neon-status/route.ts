import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTimeMs = Date.now() - start;

    return NextResponse.json({
      status: "connected",
      database: "MissionControlDB",
      provider: "Neon",
      region: "eu-central-1 (Frankfurt)",
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "error",
        database: "MissionControlDB",
        provider: "Neon",
        region: "eu-central-1 (Frankfurt)",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
