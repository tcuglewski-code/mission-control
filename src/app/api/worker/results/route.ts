import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskName, status, summary, domain, severity, findings, metrics } =
      body;

    if (!taskName) {
      return NextResponse.json(
        { error: "taskName is required" },
        { status: 400 }
      );
    }

    const result = await prisma.workerResult.create({
      data: {
        taskName,
        status: status || "ok",
        summary: summary || null,
        domain: domain || null,
        severity: severity || "info",
        findings: findings || null,
        metrics: metrics || null,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[worker/results] POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const taskName = searchParams.get("taskName") ?? undefined;

    const where = taskName ? { taskName } : {};

    const results = await prisma.workerResult.findMany({
      where,
      orderBy: { runTs: "desc" },
      take: limit,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[worker/results] GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
