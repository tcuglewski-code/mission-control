import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

const SEED_ANNOUNCEMENTS = [
  {
    title: "Willkommen in Mission Control!",
    content:
      "Hallo Team! 👋\n\nMission Control ist euer zentrales Koordinationssystem für alle Projekte der Koch Aufforstung GmbH.\n\nHier findet ihr:\n- Aufgaben und Sprints\n- Projektübersichten\n- Team-Kommunikation\n- KI-Digest und mehr\n\nViel Erfolg bei der Arbeit!",
    priority: "normal",
    pinned: true,
  },
  {
    title: "Sprint AF-BJ abgeschlossen — 35 Features deployed!",
    content:
      "🎉 Großartiger Meilenstein!\n\nSprint AF-BJ wurde erfolgreich abgeschlossen. Insgesamt wurden 35 neue Features deployed:\n\n- Dashboard-Widgets\n- Task-Management\n- Sprint-Planning\n- Webhook-Integration\n- Viele Bug-Fixes und Performance-Verbesserungen\n\nDanke an das gesamte Team für den großartigen Einsatz!",
    priority: "wichtig",
    pinned: false,
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Seed bei leerem Board
    const count = await prisma.announcement.count();
    if (count === 0) {
      await prisma.announcement.createMany({ data: SEED_ANNOUNCEMENTS });
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("[GET /api/announcements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Nur Admins dürfen Ankündigungen erstellen" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, priority = "normal", pinned = false } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Titel und Inhalt sind erforderlich" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority,
        pinned,
        authorId: user.id,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("[POST /api/announcements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
