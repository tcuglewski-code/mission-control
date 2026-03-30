import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { sendSlackMessage, formatTestMessage } from "@/lib/slack";

const BASE_URL = process.env.NEXTAUTH_URL || "https://mission-control-tawny-omega.vercel.app";

/**
 * POST /api/integrations/slack/test
 * Sendet eine Test-Nachricht an den konfigurierten Slack-Webhook
 */
export async function POST(req: NextRequest) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nur Admins dürfen testen
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    // Hole Slack-Konfiguration
    const config = await prisma.integrationConfig.findUnique({
      where: { type: "slack" },
    });

    if (!config?.webhookUrl) {
      return NextResponse.json(
        { error: "Slack webhook URL not configured" },
        { status: 400 }
      );
    }

    // Sende Test-Nachricht
    const message = formatTestMessage(BASE_URL);
    const result = await sendSlackMessage(config.webhookUrl, message);

    // Update Status in DB
    await prisma.integrationConfig.update({
      where: { type: "slack" },
      data: {
        lastTestedAt: new Date(),
        status: result.success ? "active" : "error",
        lastError: result.success ? null : result.error,
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test-Nachricht erfolgreich gesendet!",
        status: result.status,
        duration: result.duration,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          status: result.status,
          duration: result.duration,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[POST /api/integrations/slack/test] Error:", error);
    return NextResponse.json(
      { error: "Test failed", details: String(error) },
      { status: 500 }
    );
  }
}
