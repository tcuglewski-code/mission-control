import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/invoices/export?status=OPEN&projectId=xxx
// Returns DATEV-compatible CSV
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const accessFilter =
      user.role !== "admin" ? { projectId: { in: user.projectAccess } } : {};

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...accessFilter,
      },
      include: {
        project: { select: { id: true, name: true } },
        items: { orderBy: { position: "asc" } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    // DATEV-kompatibles CSV Format
    // Spalten: Belegnummer;Belegdatum;Fälligkeitsdatum;Buchungstext;Umsatz;Soll/Haben;Konto;Gegenkonto;Steuersatz;Kostenstelle
    const header = [
      "Belegnummer",
      "Belegdatum",
      "Fälligkeitsdatum",
      "Buchungstext",
      "Nettobetrag",
      "MwSt-Betrag",
      "Bruttobetrag",
      "Status",
      "Bezahlt am",
      "Zahlungsart",
      "Kunde",
      "Projekt",
      "Kostenstelle",
    ].join(";");

    const rows = invoices.map((inv) => {
      // Netto + MwSt aus Items berechnen falls vorhanden
      let netto = 0;
      let mwst = 0;
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const itemNetto = item.quantity * item.unitPrice;
          netto += itemNetto;
          mwst += itemNetto * (item.vatRate / 100);
        }
      } else {
        // Fallback: 19% rückrechnen
        netto = inv.amount / 1.19;
        mwst = inv.amount - netto;
      }

      const fmt = (n: number) => n.toFixed(2).replace(".", ",");
      const fmtDate = (d: Date | string | null) =>
        d ? new Date(d).toLocaleDateString("de-DE") : "";

      const statusLabels: Record<string, string> = {
        OPEN: "Offen",
        PAID: "Bezahlt",
        OVERDUE: "Überfällig",
        CANCELLED: "Storniert",
        DRAFT: "Entwurf",
      };

      return [
        inv.number,
        fmtDate(inv.invoiceDate),
        fmtDate(inv.dueDate),
        inv.description || inv.project.name,
        fmt(netto),
        fmt(mwst),
        fmt(inv.amount),
        statusLabels[inv.status] ?? inv.status,
        fmtDate(inv.paidAt),
        inv.paymentMethod || "",
        inv.clientName || "",
        inv.project.name,
        inv.projectId,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    });

    // DATEV-Header (Stammsatz)
    const datevHeader = `"EXTF";510;21;"Buchungsstapel";7;${new Date().toLocaleDateString("de-DE")};;;;"Koch Aufforstung GmbH";;;;;;;;;;;;\r\n`;
    const csvContent =
      datevHeader + header + "\r\n" + rows.join("\r\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rechnungen-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/invoices/export]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
