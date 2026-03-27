import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// CSV-Format: name,description,status,priority,projectId,dueDate
// POST /api/tasks/csv-import
// Body: { csv: string, preview: boolean }

interface CsvRow {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  dueDate?: string;
}

function csvParsieren(csvText: string): CsvRow[] {
  const zeilen = csvText.trim().split("\n");
  if (zeilen.length < 2) return [];

  // Header-Zeile parsen (komma- oder semikolon-getrennt)
  const trennzeichen = zeilen[0].includes(";") ? ";" : ",";
  const header = zeilen[0].split(trennzeichen).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  return zeilen.slice(1).map((zeile) => {
    const werte = zeile.split(trennzeichen).map((w) => w.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = werte[i] ?? "";
    });
    return {
      name: row.name ?? row.titel ?? row.title ?? "",
      description: row.description ?? row.beschreibung ?? undefined,
      status: row.status ?? "todo",
      priority: row.priority ?? row.prioritaet ?? "medium",
      projectId: row.projectid ?? row.projekt_id ?? row.project ?? undefined,
      dueDate: row.duedate ?? row.faelligkeitsdatum ?? row.due_date ?? undefined,
    };
  }).filter((row) => row.name.trim());
}

function valideStatus(s: string): string {
  const gueltig = ["todo", "in_progress", "done", "blocked", "review"];
  return gueltig.includes(s.toLowerCase()) ? s.toLowerCase() : "todo";
}

function validePrioritaet(p: string): string {
  const gueltig = ["low", "medium", "high", "urgent"];
  if (gueltig.includes(p.toLowerCase())) return p.toLowerCase();
  // Deutsche Bezeichnungen übersetzen
  const mapping: Record<string, string> = {
    niedrig: "low",
    mittel: "medium",
    hoch: "high",
    dringend: "urgent",
  };
  return mapping[p.toLowerCase()] ?? "medium";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { csv, preview = false } = body;

    if (!csv?.trim()) {
      return NextResponse.json({ error: "CSV-Inhalt fehlt" }, { status: 400 });
    }

    const rows = csvParsieren(csv);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Zeilen im CSV gefunden" },
        { status: 400 }
      );
    }

    if (rows.length > 200) {
      return NextResponse.json(
        { error: "Maximal 200 Tasks pro Import erlaubt" },
        { status: 400 }
      );
    }

    // Vorschau-Modus: Nur validieren, nicht importieren
    if (preview) {
      const validiert = rows.map((row, i) => ({
        zeile: i + 2,
        name: row.name,
        description: row.description,
        status: valideStatus(row.status ?? "todo"),
        priority: validePrioritaet(row.priority ?? "medium"),
        projectId: row.projectId || null,
        dueDate: row.dueDate
          ? (() => {
              try { return new Date(row.dueDate!).toISOString(); }
              catch { return null; }
            })()
          : null,
        gueltig: Boolean(row.name.trim()),
      }));

      return NextResponse.json({
        preview: true,
        anzahl: validiert.length,
        tasks: validiert,
      });
    }

    // Import durchführen
    const erstellteTasks = await Promise.allSettled(
      rows.map((row) =>
        prisma.task.create({
          data: {
            title: row.name.trim(),
            description: row.description?.trim() || null,
            status: valideStatus(row.status ?? "todo"),
            priority: validePrioritaet(row.priority ?? "medium"),
            projectId: row.projectId || null,
            dueDate: row.dueDate
              ? (() => {
                  try { return new Date(row.dueDate!); }
                  catch { return null; }
                })()
              : null,
          },
        })
      )
    );

    const erfolgreich = erstellteTasks.filter((r) => r.status === "fulfilled").length;
    const fehlgeschlagen = erstellteTasks.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      ok: true,
      importiert: erfolgreich,
      fehlgeschlagen,
      gesamt: rows.length,
    });
  } catch (error: any) {
    console.error("[POST /api/tasks/csv-import]", error);
    return NextResponse.json({ error: error.message ?? "Interner Serverfehler" }, { status: 500 });
  }
}
