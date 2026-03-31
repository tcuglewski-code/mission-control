import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import { requireAdminFromDb } from "@/lib/api-auth";

const execAsync = promisify(exec);

const AMADEUS_TOKEN = "AmadeusLoop2026!xK9mP";

/**
 * GET /api/admin/db-sync
 * Returns current database status: table count, last migration info
 */
export async function GET(req: NextRequest) {
  // Auth: either admin session or AMADEUS_TOKEN
  const amadeusHeader = req.headers.get("x-amadeus-token");
  const isAmadeus = amadeusHeader === AMADEUS_TOKEN;
  
  if (!isAmadeus) {
    const admin = await requireAdminFromDb();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get table count by querying pg_tables
    const tableCountResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    const tableCount = Number(tableCountResult[0]?.count ?? 0);

    // Get last migration from _prisma_migrations table
    let lastMigration = null;
    try {
      const migrations = await prisma.$queryRaw<{ migration_name: string; finished_at: Date }[]>`
        SELECT migration_name, finished_at 
        FROM "_prisma_migrations" 
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC 
        LIMIT 1
      `;
      if (migrations.length > 0) {
        lastMigration = {
          name: migrations[0].migration_name,
          finishedAt: migrations[0].finished_at,
        };
      }
    } catch {
      // _prisma_migrations table might not exist yet
      lastMigration = null;
    }

    // Get all table names
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    return NextResponse.json({
      status: "ok",
      tableCount,
      tables: tables.map(t => t.table_name),
      lastMigration,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[db-sync] Error getting DB status:", error);
    return NextResponse.json(
      { error: "Failed to get database status", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/db-sync
 * Executes prisma db push --accept-data-loss
 */
export async function POST(req: NextRequest) {
  // Auth: either admin session or AMADEUS_TOKEN
  const amadeusHeader = req.headers.get("x-amadeus-token");
  const isAmadeus = amadeusHeader === AMADEUS_TOKEN;
  
  if (!isAmadeus) {
    const admin = await requireAdminFromDb();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // Execute prisma db push
    // Note: In Vercel serverless, this will use the bundled prisma CLI
    const { stdout, stderr } = await execAsync(
      "npx prisma db push --accept-data-loss --skip-generate",
      {
        timeout: 60000, // 60 second timeout
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          DIRECT_URL: process.env.DIRECT_URL,
        },
      }
    );

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "Database schema synchronized successfully",
      stdout: stdout || "(no output)",
      stderr: stderr || null,
      duration: `${duration}ms`,
      executedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; message?: string };

    console.error("[db-sync] Error executing prisma db push:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync database schema",
        stdout: execError.stdout || null,
        stderr: execError.stderr || execError.message || String(error),
        duration: `${duration}ms`,
        executedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
