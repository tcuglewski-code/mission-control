import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fileType   = searchParams.get("fileType");
    const search     = searchParams.get("search");
    const projectId  = searchParams.get("projectId");
    const uploader   = searchParams.get("uploader");
    const dateFrom   = searchParams.get("dateFrom");
    const dateTo     = searchParams.get("dateTo");

    const andClauses: object[] = [];

    // Zugriffskontrolle
    if (user.role !== "admin") {
      andClauses.push({
        OR: [{ projectId: null }, { projectId: { in: user.projectAccess } }],
      });
    }

    if (projectId) andClauses.push({ projectId });
    if (fileType && fileType !== "all") andClauses.push({ fileType });
    if (uploader)  andClauses.push({ uploader: { contains: uploader } });
    if (search)    andClauses.push({ name: { contains: search, mode: "insensitive" } });
    if (dateFrom)  andClauses.push({ createdAt: { gte: new Date(dateFrom) } });
    if (dateTo)    andClauses.push({ createdAt: { lte: new Date(dateTo) } });

    const docs = await prisma.fileDoc.findMany({
      where: andClauses.length > 0 ? { AND: andClauses } : {},
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[GET /api/documents]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, url, fileType, size, projectId } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name und URL sind Pflichtfelder" }, { status: 400 });
    }

    if (
      projectId &&
      user.role !== "admin" &&
      !user.projectAccess.includes(projectId)
    ) {
      return NextResponse.json({ error: "Kein Zugriff auf dieses Projekt" }, { status: 403 });
    }

    const doc = await prisma.fileDoc.create({
      data: {
        name,
        description: description ?? null,
        url,
        fileType:      fileType ?? "link",
        size:          size ?? null,
        uploader:      user.username ?? user.email ?? "System",
        uploaderEmail: user.email ?? null,
        projectId:     projectId ?? null,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
