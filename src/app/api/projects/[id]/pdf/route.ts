import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// GET /api/projects/[id]/pdf — Projekt-Report als PDF (via HTML-to-PDF)
// Gibt HTML zurück das der Client als PDF drucken kann (window.print())
// Alternativ: Direkt als HTML-Dokument für Print-to-PDF im Browser

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUS_FARBE: Record<string, string> = {
  todo: "#71717a",
  in_progress: "#3b82f6",
  done: "#10b981",
  blocked: "#ef4444",
  review: "#f59e0b",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Fertig",
  blocked: "Blockiert",
  review: "Review",
};

const PRIO_LABEL: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Projektdaten laden
    const projekt = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { name: true } },
            sprint: { select: { name: true } },
          },
          orderBy: [{ status: "asc" }, { priority: "desc" }],
        },
        members: {
          include: { user: { select: { name: true, role: true } } },
        },
        sprints: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!projekt) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Statistiken berechnen
    const taskStats = {
      gesamt: projekt.tasks.length,
      offen: projekt.tasks.filter((t) => t.status === "todo").length,
      inArbeit: projekt.tasks.filter((t) => t.status === "in_progress").length,
      fertig: projekt.tasks.filter((t) => t.status === "done").length,
      blockiert: projekt.tasks.filter((t) => t.status === "blocked").length,
    };

    const fortschritt = taskStats.gesamt > 0
      ? Math.round((taskStats.fertig / taskStats.gesamt) * 100)
      : 0;

    // HTML-Report generieren
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projekt-Report: ${projekt.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: white;
      padding: 40px;
      line-height: 1.6;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .header { 
      border-bottom: 3px solid ${projekt.color ?? "#3b82f6"}; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .header h1 { font-size: 28px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .header .meta { color: #666; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 6px;
    }
    .section { margin-bottom: 28px; }
    .section h2 { 
      font-size: 16px; 
      font-weight: 700; 
      color: #111; 
      margin-bottom: 12px; 
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
    }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card {
      background: #f9f9f9;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .stat-card .zahl { font-size: 28px; font-weight: 700; }
    .stat-card .label { font-size: 11px; color: #666; margin-top: 2px; }
    .progress-bar { 
      height: 8px; 
      background: #e5e5e5; 
      border-radius: 4px; 
      overflow: hidden; 
      margin: 8px 0 16px;
    }
    .progress-fill { 
      height: 100%; 
      background: ${projekt.color ?? "#3b82f6"}; 
      border-radius: 4px; 
      width: ${fortschritt}%;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { 
      background: #f5f5f5; 
      padding: 8px 10px; 
      text-align: left; 
      font-weight: 600; 
      border-bottom: 2px solid #e5e5e5;
      color: #444;
    }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:hover td { background: #fafafa; }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .sprint-card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }
    .sprint-card h3 { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .member-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .member-card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 16px; 
      border-top: 1px solid #e5e5e5; 
      color: #999; 
      font-size: 10px; 
      text-align: center;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${projekt.color ?? "#3b82f6"};
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">📄 Als PDF speichern</button>

  <!-- Header -->
  <div class="header">
    <h1>${projekt.name}</h1>
    <div class="meta">
      <span class="badge" style="background:${(projekt.color ?? "#3b82f6") + "20"};color:${projekt.color ?? "#3b82f6"}">${projekt.status ?? "Aktiv"}</span>
      ${projekt.stack ? `<span class="badge" style="background:#f5f5f5;color:#666">${projekt.stack}</span>` : ""}
      <span style="color:#999;margin-left:8px">
        Report erstellt: ${format(new Date(), "d. MMMM yyyy, HH:mm", { locale: de })} Uhr
      </span>
    </div>
    ${projekt.description ? `<p style="margin-top:10px;color:#444;font-size:13px">${projekt.description}</p>` : ""}
  </div>

  <!-- Statistiken -->
  <div class="section">
    <h2>📊 Übersicht</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="zahl" style="color:#111">${taskStats.gesamt}</div>
        <div class="label">Tasks gesamt</div>
      </div>
      <div class="stat-card">
        <div class="zahl" style="color:#10b981">${taskStats.fertig}</div>
        <div class="label">Fertig</div>
      </div>
      <div class="stat-card">
        <div class="zahl" style="color:#3b82f6">${taskStats.inArbeit}</div>
        <div class="label">In Arbeit</div>
      </div>
      <div class="stat-card">
        <div class="zahl" style="color:#ef4444">${taskStats.blockiert}</div>
        <div class="label">Blockiert</div>
      </div>
    </div>
    <p style="font-size:12px;color:#666;margin-bottom:4px">Fortschritt: ${fortschritt}%</p>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    ${projekt.liveUrl ? `<p style="font-size:11px;color:#666">Live URL: <a href="${projekt.liveUrl}" style="color:${projekt.color ?? "#3b82f6"}">${projekt.liveUrl}</a></p>` : ""}
    ${projekt.githubRepo ? `<p style="font-size:11px;color:#666">GitHub: <a href="https://github.com/${projekt.githubRepo}" style="color:${projekt.color ?? "#3b82f6"}">${projekt.githubRepo}</a></p>` : ""}
  </div>

  <!-- Task-Liste nach Status -->
  <div class="section">
    <h2>📋 Tasks nach Status</h2>
    ${["done", "in_progress", "todo", "blocked", "review"].map((status) => {
      const tasksInStatus = projekt.tasks.filter((t) => t.status === status);
      if (tasksInStatus.length === 0) return "";
      return `
        <h3 style="font-size:13px;font-weight:600;margin:16px 0 8px;color:#444">
          <span class="status-dot" style="background:${STATUS_FARBE[status]}"></span>
          ${STATUS_LABEL[status] ?? status} (${tasksInStatus.length})
        </h3>
        <table>
          <tr>
            <th>Titel</th>
            <th>Priorität</th>
            <th>Assignee</th>
            <th>Sprint</th>
            <th>Fällig</th>
          </tr>
          ${tasksInStatus.map((task) => `
            <tr>
              <td>${task.title}</td>
              <td>${PRIO_LABEL[task.priority] ?? task.priority}</td>
              <td>${task.assignee?.name ?? "—"}</td>
              <td>${task.sprint?.name ?? "—"}</td>
              <td>${task.dueDate ? format(new Date(task.dueDate), "d. MMM yyyy", { locale: de }) : "—"}</td>
            </tr>
          `).join("")}
        </table>
      `;
    }).join("")}
  </div>

  <!-- Team -->
  ${projekt.members.length > 0 ? `
  <div class="section">
    <h2>👥 Team-Mitglieder</h2>
    <div class="member-grid">
      ${projekt.members.map((m) => `
        <div class="member-card">
          <p style="font-weight:600;font-size:12px">${m.user.name}</p>
          <p style="color:#666;font-size:11px">${m.role} · ${m.user.role}</p>
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Sprints -->
  ${projekt.sprints.length > 0 ? `
  <div class="section">
    <h2>🏃 Sprints</h2>
    ${projekt.sprints.map((s) => `
      <div class="sprint-card">
        <h3>${s.name}</h3>
        ${s.goal ? `<p style="color:#666;font-size:11px;margin-bottom:4px">${s.goal}</p>` : ""}
        <div style="display:flex;gap:16px;font-size:11px;color:#888">
          <span>Status: ${s.status}</span>
          ${s.startDate ? `<span>Start: ${format(new Date(s.startDate), "d. MMM", { locale: de })}</span>` : ""}
          ${s.endDate ? `<span>Ende: ${format(new Date(s.endDate), "d. MMM yyyy", { locale: de })}</span>` : ""}
        </div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  <div class="footer">
    Mission Control — Koch Aufforstung GmbH · Vertraulicher Projektreport · ${format(new Date(), "yyyy")}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Direkt im Browser öffnen (nicht herunterladen)
        "Content-Disposition": `inline; filename="report-${projekt.name.toLowerCase().replace(/\s+/g, "-")}.html"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]/pdf]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
