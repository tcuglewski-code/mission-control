import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/clients/:id/activity
// Aggregiert Aktivitäten aus Projekten, Angeboten und Rechnungen für einen Kunden
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
        },
        quotes: {
          select: { id: true, number: true, title: true, status: true, amount: true, createdAt: true, updatedAt: true },
        },
        invoices: {
          select: { id: true, number: true, amount: true, status: true, createdAt: true, paidAt: true, invoiceDate: true },
        },
      },
    });

    if (!client) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    type ActivityItem = {
      id: string;
      type: "projekt_gestartet" | "projekt_abgeschlossen" | "angebot_erstellt" | "angebot_gesendet" | "rechnung_erstellt" | "rechnung_bezahlt";
      label: string;
      detail: string;
      date: Date;
      link: string;
    };

    const items: ActivityItem[] = [];

    // Projekte
    for (const p of client.projects) {
      items.push({
        id: `proj-created-${p.id}`,
        type: "projekt_gestartet",
        label: "Projekt gestartet",
        detail: p.name,
        date: p.createdAt,
        link: `/projects/${p.id}`,
      });
      if (p.status === "completed" || p.status === "done") {
        items.push({
          id: `proj-done-${p.id}`,
          type: "projekt_abgeschlossen",
          label: "Projekt abgeschlossen",
          detail: p.name,
          date: p.updatedAt,
          link: `/projects/${p.id}`,
        });
      }
    }

    // Angebote
    for (const q of client.quotes) {
      items.push({
        id: `quote-created-${q.id}`,
        type: "angebot_erstellt",
        label: "Angebot erstellt",
        detail: `${q.number} – ${q.title}`,
        date: q.createdAt,
        link: `/quotes/${q.id}`,
      });
      if (q.status === "sent" || q.status === "accepted") {
        items.push({
          id: `quote-sent-${q.id}`,
          type: "angebot_gesendet",
          label: q.status === "accepted" ? "Angebot angenommen" : "Angebot gesendet",
          detail: `${q.number} – ${q.title}`,
          date: q.updatedAt,
          link: `/quotes/${q.id}`,
        });
      }
    }

    // Rechnungen
    for (const inv of client.invoices) {
      items.push({
        id: `inv-created-${inv.id}`,
        type: "rechnung_erstellt",
        label: "Rechnung erstellt",
        detail: `${inv.number}`,
        date: inv.invoiceDate,
        link: `/finance?invoice=${inv.id}`,
      });
      if (inv.paidAt) {
        items.push({
          id: `inv-paid-${inv.id}`,
          type: "rechnung_bezahlt",
          label: "Rechnung bezahlt",
          detail: `${inv.number}`,
          date: inv.paidAt,
          link: `/finance?invoice=${inv.id}`,
        });
      }
    }

    // Chronologisch sortieren (neueste zuerst)
    items.sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/clients/:id/activity]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
