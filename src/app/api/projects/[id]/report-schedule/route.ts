import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/projects/[id]/report-schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const schedule = await prisma.projectReportSchedule.findFirst({
      where: { projectId: id },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[GET /api/projects/[id]/report-schedule]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/projects/[id]/report-schedule — Erstellt oder aktualisiert Schedule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.mcRole !== "admin" && user.mcRole !== "projektmanager") {
      return NextResponse.json({ error: "Nur Admins können Report-Schedules konfigurieren" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { emails, interval = "weekly", active = true } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Mindestens eine E-Mail-Adresse erforderlich" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

    const existing = await prisma.projectReportSchedule.findFirst({
      where: { projectId: id },
    });

    let schedule;
    if (existing) {
      schedule = await prisma.projectReportSchedule.update({
        where: { id: existing.id },
        data: { emails, interval, active },
      });
    } else {
      schedule = await prisma.projectReportSchedule.create({
        data: { projectId: id, emails, interval, active },
      });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[POST /api/projects/[id]/report-schedule]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/report-schedule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.mcRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.projectReportSchedule.deleteMany({ where: { projectId: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]/report-schedule]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
