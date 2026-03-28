import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "MC_API_KEY",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
];

// GET /api/settings/system — System-Status abrufen
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Datenbank-Verbindung prüfen
    let dbOk = false;
    let dbLatencyMs: number | null = null;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    // 2. Umgebungsvariablen-Checkliste (nur gesetzt/nicht gesetzt — nie Werte!)
    const envCheck: Record<string, boolean> = {};
    for (const v of REQUIRED_ENV_VARS) {
      envCheck[v] = Boolean(process.env[v]);
    }

    // 3. Fehler-Protokoll (letzte 50)
    const errorLogs = await prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        path: true,
        method: true,
        statusCode: true,
        message: true,
        createdAt: true,
      },
    });

    // 4. Deployment-Info (aus Vercel-Umgebungsvariablen)
    const deploymentInfo = {
      env: process.env.VERCEL_ENV ?? "development",
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      gitRepoOwner: process.env.VERCEL_GIT_REPO_OWNER ?? null,
      gitRepoSlug: process.env.VERCEL_GIT_REPO_SLUG ?? null,
      region: process.env.VERCEL_REGION ?? null,
      deployedAt: process.env.VERCEL_GIT_COMMIT_AUTHORED_DATE ?? null,
    };

    // 5. Vercel Deployments via API (optional — nur wenn VERCEL_TOKEN gesetzt)
    let vercelDeploys: Array<{
      uid: string;
      name: string;
      state: string;
      created: number;
      url: string;
      meta?: Record<string, string>;
    }> = [];

    if (process.env.VERCEL_TOKEN) {
      try {
        const res = await fetch(
          "https://api.vercel.com/v6/deployments?limit=5&projectId=" +
            (process.env.VERCEL_PROJECT_ID ?? ""),
          {
            headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
            next: { revalidate: 60 },
          }
        );
        if (res.ok) {
          const data = await res.json();
          vercelDeploys = (data.deployments ?? []).map(
            (d: { uid: string; name: string; readyState: string; createdAt: number; url: string; meta?: Record<string, string> }) => ({
              uid: d.uid,
              name: d.name,
              state: d.readyState,
              created: d.createdAt,
              url: `https://${d.url}`,
              meta: d.meta,
            })
          );
        }
      } catch {
        // Ignore Vercel API errors
      }
    }

    return NextResponse.json({
      db: { ok: dbOk, latencyMs: dbLatencyMs },
      deployment: deploymentInfo,
      vercelDeploys,
      envCheck,
      errorLogs,
    });
  } catch (error) {
    console.error("[GET /api/settings/system]", error);
    await logApiError({ path: "/api/settings/system", method: "GET", statusCode: 500, message: String(error) });
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
