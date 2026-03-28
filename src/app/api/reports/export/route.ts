import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// GET /api/reports/export?type=tasks|time|invoices&format=csv&projectId=xxx&columns=title,status,...
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "tasks";
    const exportFormat = searchParams.get("format") ?? "csv";
    const projectId = searchParams.get("projectId");
    const columnsParam = searchParams.get("columns");

    const today = format(new Date(), "yyyy-MM-dd");
    const accessFilter =
      user.role !== "admin" ? { projectId: { in: user.projectAccess } } : {};

    let csvContent = "";
    let filename = "";

    if (type === "tasks") {
      // Spalten-Auswahl
      const allColumns = ["id", "title", "status", "priority", "assignee", "project", "sprint", "milestone", "dueDate", "storyPoints", "labels", "createdAt", "updatedAt"];
      const selectedColumns = columnsParam
        ? columnsParam.split(",").filter((c) => allColumns.includes(c))
        : allColumns;

      const tasks = await prisma.task.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...accessFilter,
        },
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
          sprint: { select: { name: true } },
          milestone: { select: { title: true } },
          taskLabels: { include: { label: { select: { name: true } } } },
        },
        orderBy: [{ projectId: "asc" }, { status: "asc" }, { priority: "desc" }],
      });

      const statusLabels: Record<string, string> = {
        todo: "Offen",
        backlog: "Backlog",
        in_progress: "In Arbeit",
        in_review: "In Review",
        done: "Erledigt",
        blocked: "Blockiert",
        cancelled: "Abgebrochen",
      };
      const priorityLabels: Record<string, string> = {
        critical: "Kritisch",
        high: "Hoch",
        medium: "Mittel",
        low: "Niedrig",
      };

      const columnLabels: Record<string, string> = {
        id: "ID",
        title: "Titel",
        status: "Status",
        priority: "Priorität",
        assignee: "Verantwortlich",
        project: "Projekt",
        sprint: "Sprint",
        milestone: "Meilenstein",
        dueDate: "Fälligkeitsdatum",
        storyPoints: "Story Points",
        labels: "Labels",
        createdAt: "Erstellt am",
        updatedAt: "Aktualisiert am",
      };

      const header = selectedColumns.map((c) => columnLabels[c] ?? c).join(";");

      const rows = tasks.map((t) => {
        const fmtDate = (d: Date | null | undefined) =>
          d ? format(new Date(d), "dd.MM.yyyy", { locale: de }) : "";

        const valueMap: Record<string, string> = {
          id: t.id,
          title: t.title,
          status: statusLabels[t.status] ?? t.status,
          priority: priorityLabels[t.priority] ?? t.priority,
          assignee: t.assignee?.name ?? "",
          project: t.project?.name ?? "",
          sprint: t.sprint?.name ?? "",
          milestone: t.milestone?.title ?? "",
          dueDate: fmtDate(t.dueDate),
          storyPoints: t.storyPoints?.toString() ?? "",
          labels: t.taskLabels.map((tl) => tl.label.name).join(", "),
          createdAt: fmtDate(t.createdAt),
          updatedAt: fmtDate(t.updatedAt),
        };

        return selectedColumns
          .map((c) => `"${(valueMap[c] ?? "").replace(/"/g, '""')}"`)
          .join(";");
      });

      csvContent = header + "\r\n" + rows.join("\r\n");
      filename = `tasks-${today}.csv`;
    } else if (type === "time") {
      const allColumns = ["id", "task", "project", "user", "description", "date", "duration", "billable"];
      const selectedColumns = columnsParam
        ? columnsParam.split(",").filter((c) => allColumns.includes(c))
        : allColumns;

      const entries = await prisma.timeEntry.findMany({
        where: {
          ...(projectId
            ? { task: { projectId } }
            : user.role !== "admin"
            ? { task: { projectId: { in: user.projectAccess } } }
            : {}),
        },
        include: {
          task: {
            include: {
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { startTime: "desc" },
      });

      const columnLabels: Record<string, string> = {
        id: "ID",
        task: "Aufgabe",
        project: "Projekt",
        user: "Mitarbeiter",
        description: "Beschreibung",
        date: "Datum",
        duration: "Dauer (Min.)",
        billable: "Abrechenbar",
      };

      const header = selectedColumns.map((c) => columnLabels[c] ?? c).join(";");

      const rows = entries.map((e) => {
        const valueMap: Record<string, string> = {
          id: e.id,
          task: e.task?.title ?? "",
          project: e.task?.project?.name ?? "",
          user: e.userId ?? "",
          description: e.description ?? "",
          date: e.startTime
            ? format(new Date(e.startTime), "dd.MM.yyyy", { locale: de })
            : "",
          duration: e.duration?.toString() ?? "",
          billable: e.billable ? "Ja" : "Nein",
        };

        return selectedColumns
          .map((c) => `"${(valueMap[c] ?? "").replace(/"/g, '""')}"`)
          .join(";");
      });

      csvContent = header + "\r\n" + rows.join("\r\n");
      filename = `zeiterfassung-${today}.csv`;
    } else if (type === "invoices") {
      const allColumns = ["number", "date", "dueDate", "client", "project", "description", "netto", "mwst", "brutto", "status", "paidAt"];
      const selectedColumns = columnsParam
        ? columnsParam.split(",").filter((c) => allColumns.includes(c))
        : allColumns;

      const invoices = await prisma.invoice.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...accessFilter,
        },
        include: {
          project: { select: { name: true } },
          items: true,
        },
        orderBy: { invoiceDate: "asc" },
      });

      const statusLabels: Record<string, string> = {
        OPEN: "Offen",
        PAID: "Bezahlt",
        OVERDUE: "Überfällig",
        CANCELLED: "Storniert",
        DRAFT: "Entwurf",
      };

      const columnLabels: Record<string, string> = {
        number: "Rechnungsnummer",
        date: "Datum",
        dueDate: "Fälligkeitsdatum",
        client: "Kunde",
        project: "Projekt",
        description: "Beschreibung",
        netto: "Nettobetrag (€)",
        mwst: "MwSt (€)",
        brutto: "Bruttobetrag (€)",
        status: "Status",
        paidAt: "Bezahlt am",
      };

      const header = selectedColumns.map((c) => columnLabels[c] ?? c).join(";");

      const rows = invoices.map((inv) => {
        let netto = 0;
        let mwst = 0;
        if (inv.items && inv.items.length > 0) {
          for (const item of inv.items) {
            const itemNetto = item.quantity * item.unitPrice;
            netto += itemNetto;
            mwst += itemNetto * (item.vatRate / 100);
          }
        } else {
          netto = inv.amount / 1.19;
          mwst = inv.amount - netto;
        }
        const fmt = (n: number) => n.toFixed(2).replace(".", ",");
        const fmtDate = (d: Date | string | null | undefined) =>
          d ? format(new Date(d as string), "dd.MM.yyyy", { locale: de }) : "";

        const valueMap: Record<string, string> = {
          number: inv.number,
          date: fmtDate(inv.invoiceDate),
          dueDate: fmtDate(inv.dueDate),
          client: inv.clientName ?? "",
          project: inv.project?.name ?? "",
          description: inv.description ?? "",
          netto: fmt(netto),
          mwst: fmt(mwst),
          brutto: fmt(inv.amount),
          status: statusLabels[inv.status] ?? inv.status,
          paidAt: fmtDate(inv.paidAt),
        };

        return selectedColumns
          .map((c) => `"${(valueMap[c] ?? "").replace(/"/g, '""')}"`)
          .join(";");
      });

      csvContent = header + "\r\n" + rows.join("\r\n");
      filename = `rechnungen-${today}.csv`;
    } else {
      return NextResponse.json({ error: "Unbekannter Typ. Erlaubt: tasks, time, invoices" }, { status: 400 });
    }

    // BOM für korrekte UTF-8 Darstellung in Excel
    const bom = "\uFEFF";
    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/export]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
